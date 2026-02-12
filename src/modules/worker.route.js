import { Router } from 'express'

import { APP_NAME, HTTP_STATUS } from '@/core/constants'
import { HttpResponse, logger } from '@/core/helpers'

import { wrapController } from '@/framework/middleware'

import webScrapingWorker from '@/modules/bds.com.vn/worker'
import { JOB_TYPE, createJob, processNextJob, rerunJob } from '@/modules/job'

const router = Router()

router.get(
  '/ping',
  wrapController(async () => {
    const rootDir = process.cwd()
    const version = await import(`${rootDir}/package.json`)
    return new HttpResponse(
      HTTP_STATUS.OK.code,
      {
        version: version?.version || 'unknown',
        lastDeployedAt: global.lastDeployedAt || 'unknown',
      },
      `${APP_NAME.WORKER}: pong`
    )
  })
)

/** POST /jobs - Tạo job (background), lưu DB. Body: { type, data?, opts? }.
 *  - type "bds_crawl_list": data: { provinceSlug?, provinceSlugs?, customListPath?, maxProvinces? }. provinceSlugs = mảng slug; customListPath = URL list (vd /mua-ban-nha-dat-ha-noi). Re-run job để tiếp tục từ trang đã lưu.
 *  - type "bds_crawl_detail": data: { batchSize?: 100 }. Chạy batch detail thủ công.
 *  Nếu chỉ gửi maxProvinces/provinceSlug/provinceSlugs/customListPath (không gửi type) thì mặc định tạo job bds_crawl_list. */
router.post(
  '/jobs',
  wrapController(async (req, _res) => {
    const body = req.body || {}
    let { type, data = {}, opts = {} } = body
    const isListBody =
      body.maxProvinces != null ||
      body.provinceSlug != null ||
      (Array.isArray(body.provinceSlugs) && body.provinceSlugs.length > 0) ||
      body.customListPath != null
    if (type == null && isListBody) {
      type = JOB_TYPE.BDS_CRAWL_LIST
      data = {
        ...data,
        maxProvinces: body.maxProvinces,
        provinceSlug: body.provinceSlug,
        provinceSlugs: body.provinceSlugs,
        customListPath: body.customListPath,
      }
    }
    if (type == null) type = JOB_TYPE.BDS_CRAWL
    const job = await createJob(type, data, opts)
    return new HttpResponse(HTTP_STATUS.OK.code, {
      id: job._id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
    })
  })
)

/** POST /jobs/process - Xử lý 1 job pending (tuần tự) */
router.post(
  '/jobs/process',
  wrapController(
    async () => {
      const processed = await processNextJob()
      return new HttpResponse(HTTP_STATUS.OK.code, {
        processed: !!processed,
        message: processed ? 'One job processed' : 'No pending job',
      })
    },
    { timeout: 60 * 60 * 1000 }
  )
)

/** POST /jobs/:id/rerun - Đưa job về pending để chạy lại (lần chạy tiếp theo hits +1) */
router.post(
  '/jobs/:id/rerun',
  wrapController(async (req, _res) => {
    const job = await rerunJob(req.params.id)
    if (!job) {
      return new HttpResponse(HTTP_STATUS.NOT_FOUND.code, {
        message: 'Job not found',
      })
    }
    return new HttpResponse(HTTP_STATUS.OK.code, {
      id: job._id,
      status: job.status,
      hits: job.hits,
      message: 'Job re-queued for next run',
    })
  })
)

/**
 * GET /bds.com.vn/run - Test nhanh với limit (không tạo job).
 * Query: limit (số item, ví dụ 5), saveToDb (0/1, default 0 khi test)
 */
router.get(
  '/bds.com.vn/run',
  wrapController(
    async (req, _res) => {
      const limit = parseInt(req.query?.limit, 10)
      const saveToDb =
        req.query?.saveToDb === '1' || req.query?.saveToDb === 'true'
      const maxListPages = parseInt(req.query?.maxListPages, 10) || 1
      logger.info('bds.com.vn run (test)', { limit, saveToDb, maxListPages })
      const result = await webScrapingWorker({
        limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
        maxListPages:
          Number.isFinite(maxListPages) && maxListPages > 0 ? maxListPages : 1,
        saveToDb,
        fetchDetails: false,
      })
      return new HttpResponse(HTTP_STATUS.OK.code, {
        total: result.posts.length,
        inserted: result.inserted,
        updated: result.updated,
        message: 'Test run completed',
      })
    },
    { timeout: 2 * 60 * 1000 }
  )
)

export default router
