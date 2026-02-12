import logger from '@/core/helpers/logger.helper'

import webScrapingWorker, {
  crawlDetailForPendingPosts,
  crawlListByProvinces,
} from '@/modules/bds.com.vn/worker'

import { JOB_STATUS, JOB_TYPE, getJobModel } from './job.schema'

const handlers = new Map()

/**
 * Đăng ký handler theo type
 * @param {string} type
 * @param {(data: object, ctx: { updateProgress: (n: number) => Promise<void> }) => Promise<object>} fn - return result
 */
export function registerHandler(type, fn) {
  handlers.set(type, fn)
}

/**
 * Tạo job, lưu DB
 * @param {string} type
 * @param {object} data - payload
 * @param {object} [opts] - priority, delay, maxAttempts
 * @returns {Promise<import('mongoose').Document>}
 */
export async function createJob(type, data = {}, opts = {}) {
  const Job = getJobModel()
  const doc = await Job.create({
    type,
    data,
    opts: {
      priority: opts.priority ?? 0,
      maxAttempts: opts.maxAttempts ?? 3,
      delay: opts.delay,
    },
    status: opts.delay ? JOB_STATUS.DELAYED : JOB_STATUS.PENDING,
  })
  logger.info(`[job] Created job ${doc._id} type=${type}`)
  return doc
}

/**
 * Lấy 1 job pending/delayed sớm nhất (ưu tiên priority cao, rồi createdAt)
 * @returns {Promise<import('mongoose').Document | null>}
 */
export async function getNextPendingJob() {
  const Job = getJobModel()
  const now = new Date()
  const doc = await Job.findOneAndUpdate(
    {
      status: { $in: [JOB_STATUS.PENDING, JOB_STATUS.DELAYED] },
      $or: [{ 'opts.delay': null }, { 'opts.delay': { $lte: now } }],
    },
    {
      $set: { status: JOB_STATUS.ACTIVE, processedOn: now },
      $inc: { 'opts.attempts': 1 },
    },
    { sort: { 'opts.priority': -1, createdAt: 1 }, new: true }
  )
  return doc
}

/**
 * Xử lý 1 job: tăng hits, gọi handler theo type, cập nhật result/failedReason
 * @param {import('mongoose').Document} job
 * @returns {Promise<void>}
 */
export async function processJob(job) {
  const { type, data, opts } = job
  await job.updateOne({ $inc: { hits: 1 } })

  const handler = handlers.get(type)
  if (!handler) {
    await job.updateOne({
      status: JOB_STATUS.FAILED,
      failedReason: `No handler for type: ${type}`,
      finishedOn: new Date(),
    })
    return
  }

  const updateProgress = async progress => {
    const pct = Math.min(100, Math.max(0, progress))
    await job.updateOne({ progress: pct })
  }
  /** Cập nhật job.data trong lúc chạy (để resume: lastPageByProvince, ...) */
  const updateJobData = async (key, value) => {
    await job.updateOne({ $set: { [`data.${key}`]: value } })
  }

  logger.info(`[job] Job ${job._id} started (type=${type})`)
  try {
    const result = await handler(data, { updateProgress, updateJobData })
    await job.updateOne({
      status: JOB_STATUS.COMPLETED,
      progress: 100,
      result,
      finishedOn: new Date(),
    })
    logger.info(`[job] Completed job ${job._id} type=${type}`)
  } catch (err) {
    const failedReason = err?.message || String(err)
    const stackTrace = err?.stack
    await job.updateOne({
      status:
        opts.attempts >= (opts.maxAttempts ?? 3)
          ? JOB_STATUS.FAILED
          : JOB_STATUS.PENDING,
      failedReason,
      stackTrace: stackTrace?.slice(0, 2000),
      finishedOn: new Date(),
    })
    logger.error(`[job] Job ${job._id} failed`, { err: failedReason })
  }
}

/**
 * Re-run job: đưa job về pending để processor lần sau lấy lại (hits tăng khi được xử lý)
 * @param {string} jobId - _id job
 * @returns {Promise<import('mongoose').Document | null>}
 */
export async function rerunJob(jobId) {
  const Job = getJobModel()
  const doc = await Job.findByIdAndUpdate(
    jobId,
    {
      $set: { status: JOB_STATUS.PENDING, progress: 0 },
      $unset: {
        result: '',
        failedReason: '',
        stackTrace: '',
        processedOn: '',
        finishedOn: '',
      },
    },
    { new: true }
  )
  if (doc)
    logger.info(
      `[job] Re-queued job ${jobId} for re-run (hits will increment on next process)`
    )
  return doc
}

/**
 * Chạy 1 vòng: lấy job tiếp theo (nếu có) và xử lý
 * @returns {Promise<boolean>} true nếu đã xử lý 1 job
 */
export async function processNextJob() {
  const job = await getNextPendingJob()
  if (!job) return false
  logger.info(
    `[job] Processing job ${job._id} type=${job.type} (attempt ${job.opts?.attempts ?? 0})`
  )
  await processJob(job)
  return true
}

/**
 * Khởi động vòng lặp background: mỗi intervalMs gọi processNextJob
 * @param {number} intervalMs
 * @returns {NodeJS.Timeout}
 */
export function startBackgroundProcessor(intervalMs = 10_000) {
  const interval = setInterval(async () => {
    try {
      await processNextJob()
    } catch (err) {
      logger.error('[job] Processor tick error', { err: err.message })
    }
  }, intervalMs)
  logger.info(`[job] Background processor started (interval=${intervalMs}ms)`)
  return interval
}

// --- Handlers mặc định ---
registerHandler(JOB_TYPE.BDS_CRAWL, async (data, ctx) => {
  const { updateProgress } = ctx
  const result = await webScrapingWorker({
    maxListPages: data.maxListPages ?? undefined,
    limit:
      typeof data.limit === 'number' && data.limit > 0 ? data.limit : undefined,
    fetchDetails: data.fetchDetails ?? true,
    saveToDb: true,
    chunkSize: data.chunkSize ?? 20,
    onProgress: (processed, total) => {
      const pct = total ? Math.round((processed / total) * 100) : 0
      updateProgress(pct)
    },
  })
  return {
    total: result.totalProcessed ?? result.posts?.length ?? 0,
    inserted: result.inserted,
    updated: result.updated,
  }
})

registerHandler(JOB_TYPE.BDS_CRAWL_LIST, async (data, ctx) => {
  const { updateProgress, updateJobData } = ctx
  const result = await crawlListByProvinces({
    provinceSlug: data.provinceSlug,
    provinceSlugs: Array.isArray(data.provinceSlugs)
      ? data.provinceSlugs
      : undefined,
    customListPath: data.customListPath,
    maxProvinces: data.maxProvinces,
    lastPageByProvince: data.lastPageByProvince ?? {},
    onProgress: (done, total, extra) => {
      const pct = total ? Math.round((done / total) * 100) : 0
      updateProgress(pct)
      if (extra?.lastPageByProvince && typeof updateJobData === 'function') {
        updateJobData('lastPageByProvince', extra.lastPageByProvince).catch(
          () => {}
        )
      }
    },
  })
  await createJob(JOB_TYPE.BDS_CRAWL_DETAIL, {
    batchSize: data.detailBatchSize ?? 100,
  })
  return {
    totalListItems: result.totalListItems,
    provincesCount: result.provincesCount,
    inserted: result.inserted,
    updated: result.updated,
  }
})

registerHandler(JOB_TYPE.BDS_CRAWL_DETAIL, async (data, ctx) => {
  const { updateProgress } = ctx
  const batchSize =
    typeof data.batchSize === 'number' && data.batchSize > 0
      ? data.batchSize
      : 100
  const result = await crawlDetailForPendingPosts({
    batchSize,
    onProgress: (processed, total) => {
      const pct = total ? Math.round((processed / total) * 100) : 0
      updateProgress(pct)
    },
  })
  return { processed: result.processed }
})
