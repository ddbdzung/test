import axios from 'axios'

import logger from '@/core/helpers/logger.helper'

import {
  BASE_URL,
  DETAIL_FETCH_DELAY_MS,
  LIST_PAGE_DELAY_MS,
  LIST_PATH,
  MAX_LIST_PAGES,
  MUA_BAN_LIST_PATH,
} from './constants'
import { mapToPost } from './mapper'
import { parseDetailPage, parseListingPage, parseProvinceList } from './parser'
import { getPostModel } from './schema'

const CRAWLER_SOURCE = 'bds.com.vn'

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0',
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  },
  maxRedirects: 5,
  validateStatus: status => status >= 200 && status < 400,
})

/**
 * Crawl danh sách trang cho-thue-nha-dat (page 1, 2, 3...). (Dùng nội bộ bởi webScrapingWorker dạng stream.)
 * @param {number | undefined} maxPages - giới hạn số trang; undefined = không giới hạn
 * @returns {Promise<Array<object>>} raw items từ listing
 */
async function _crawlListPages(maxPages) {
  const allItems = []
  const seenSubIds = new Set()

  for (let page = 1; ; page += 1) {
    if (typeof maxPages === 'number' && maxPages > 0 && page > maxPages) break

    const path = page === 1 ? LIST_PATH : `${LIST_PATH}-page${page}`
    try {
      const { data } = await axiosInstance.get(path)
      const items = parseListingPage(data, BASE_URL)
      for (const item of items) {
        if (!seenSubIds.has(item.subId)) {
          seenSubIds.add(item.subId)
          allItems.push(item)
        }
      }
      logger.info(
        `[bds.com.vn] List page ${page}: ${items.length} items (total unique: ${allItems.length})`
      )
      if (items.length === 0) break
    } catch (err) {
      logger.warn(`[bds.com.vn] List page ${page} failed`, { err: err.message })
      break
    }
  }

  return allItems
}

/**
 * Crawl 1 trang chi tiết (optional, có delay để tránh bị chặn)
 * @param {string} href
 * @returns {Promise<object | null>} parseDetailPage result hoặc null
 */
async function fetchDetail(href) {
  try {
    const url = href.startsWith('http') ? href : BASE_URL + href
    const { data } = await axiosInstance.get(url)
    return parseDetailPage(data, BASE_URL)
  } catch (err) {
    logger.debug(`[bds.com.vn] Detail fetch failed: ${href}`, {
      err: err.message,
    })
    return null
  }
}

const LIST_CHUNK_SIZE = 80

/**
 * Chuẩn hóa path list: bỏ domain, đảm bảo bắt đầu bằng /
 */
function normalizeListPath(path) {
  if (!path || typeof path !== 'string') return ''
  const s = path
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/\?.*$/, '')
  return s.startsWith('/') ? s : `/${s}`
}

/**
 * Crawl list theo 63 tỉnh (mua-bán): lấy provinces từ trang chủ, quét từng tỉnh đến khi 0 item, chỉ lưu list (detailHref + listRaw).
 * Hỗ trợ resume: truyền lastPageByProvince (vd { "ha-noi": 1752 }) để tiếp tục từ trang sau khi crash.
 * Chọn tỉnh: provinceSlug (1 tỉnh) hoặc provinceSlugs (mảng slug). Chỉ định URL: customListPath (vd /mua-ban-nha-dat-ha-noi).
 * @param {object} [opts]
 * @param {string} [opts.provinceSlug] - chỉ crawl 1 tỉnh
 * @param {string[]} [opts.provinceSlugs] - chỉ crawl các tỉnh trong danh sách (bỏ qua fetch trang chủ)
 * @param {string} [opts.customListPath] - crawl đúng URL list này (vd /mua-ban-nha-dat-ha-noi), page 2+ = path-page2, path-page3...
 * @param {number} [opts.maxProvinces] - giới hạn số tỉnh (khi không dùng provinceSlugs/customListPath)
 * @param {Record<string, number>} [opts.lastPageByProvince] - trang đã xong mỗi tỉnh (để resume)
 * @param {function} [opts.onProgress] - (provincesDone, totalProvinces, extra?) với extra.lastPageByProvince để lưu state
 * @returns {Promise<{ totalListItems: number, provincesCount: number, inserted: number, updated: number }>}
 */
export async function crawlListByProvinces(opts = {}) {
  const {
    provinceSlug,
    provinceSlugs,
    customListPath,
    maxProvinces,
    lastPageByProvince: initialLastPage = {},
    onProgress,
  } = opts
  const axiosInst = axiosInstance
  /** Mỗi phần tử: { slug, name, listPathBase } */
  let provinces = []

  if (customListPath) {
    const path = normalizeListPath(customListPath)
    if (!path) {
      logger.warn('[bds.com.vn] customListPath invalid', { customListPath })
      return { totalListItems: 0, provincesCount: 0, inserted: 0, updated: 0 }
    }
    provinces = [{ slug: '_custom', name: 'custom', listPathBase: path }]
    logger.info(`[bds.com.vn] Crawl custom list path: ${path}`)
  } else if (Array.isArray(provinceSlugs) && provinceSlugs.length > 0) {
    provinces = provinceSlugs
      .filter(s => s && typeof s === 'string')
      .map(slug => ({
        slug: slug.trim(),
        name: slug,
        listPathBase: `${MUA_BAN_LIST_PATH}-${slug.trim()}`,
      }))
    logger.info(
      `[bds.com.vn] Crawl selected provinces: ${provinces.map(p => p.slug).join(', ')}`
    )
  } else {
    try {
      const { data } = await axiosInst.get(MUA_BAN_LIST_PATH)
      provinces = parseProvinceList(data, BASE_URL).map(p => ({
        ...p,
        listPathBase: `${MUA_BAN_LIST_PATH}-${p.slug}`,
      }))
    } catch (err) {
      logger.warn('[bds.com.vn] Failed to fetch province list', {
        err: err.message,
      })
      return { totalListItems: 0, provincesCount: 0, inserted: 0, updated: 0 }
    }
    if (provinceSlug) {
      provinces = provinces.filter(p => p.slug === provinceSlug)
    } else if (typeof maxProvinces === 'number' && maxProvinces > 0) {
      provinces = provinces.slice(0, maxProvinces)
    }
  }

  const totalProvinces = provinces.length
  const hasResume = Object.keys(initialLastPage).length > 0
  if (hasResume) {
    logger.info(
      `[bds.com.vn] Resuming list crawl: lastPageByProvince`,
      initialLastPage
    )
  }
  logger.info(
    `[bds.com.vn] Crawl list by provinces: ${totalProvinces} provinces (save every ${LIST_CHUNK_SIZE} items)`
  )
  let totalListItems = 0
  let totalInserted = 0
  let totalUpdated = 0
  let saveBuffer = []
  let lastPageByProvince = { ...initialLastPage }
  const flush = async () => {
    if (saveBuffer.length === 0) return
    const { inserted, updated } = await saveCrawledPosts(saveBuffer)
    totalInserted += inserted
    totalUpdated += updated
    saveBuffer = []
  }
  for (let pi = 0; pi < provinces.length; pi += 1) {
    const prov = provinces[pi]
    const slug = prov.slug
    const listPathBase = prov.listPathBase || `${MUA_BAN_LIST_PATH}-${slug}`
    const logLabel =
      slug === '_custom' && listPathBase
        ? listPathBase
            .replace(/^\/+|\/+$/g, '')
            .split('/')
            .pop() || 'custom'
        : slug
    const startPage = (lastPageByProvince[slug] ?? 0) + 1
    if (startPage > 1) {
      logger.info(
        `[bds.com.vn] [${logLabel}] Resuming from page ${startPage} (path: ${listPathBase})`
      )
    } else {
      logger.info(
        `[bds.com.vn] [${logLabel}] Starting list crawl (path: ${listPathBase})`
      )
    }
    for (let page = startPage; ; page += 1) {
      if (LIST_PAGE_DELAY_MS > 0 && page > 1) {
        await new Promise(r => setTimeout(r, LIST_PAGE_DELAY_MS))
      }
      const path = page === 1 ? listPathBase : `${listPathBase}-page${page}`
      try {
        const { data } = await axiosInst.get(path)
        const items = parseListingPage(data, BASE_URL)
        if (items.length === 0) break
        for (const raw of items) {
          try {
            const post = mapToPost(raw, null)
            const listOnly = {
              ...post,
              detailHref: raw.href,
              detailFetched: false,
              listRaw: raw,
            }
            saveBuffer.push(listOnly)
            totalListItems += 1
            if (saveBuffer.length >= LIST_CHUNK_SIZE) await flush()
          } catch (e) {
            logger.warn(`[bds.com.vn] Map list failed subId=${raw.subId}`, {
              err: e.message,
            })
          }
        }
        lastPageByProvince[slug] = page
        logger.info(
          `[bds.com.vn] [${logLabel}] Page ${page} (trang ${page}): ${items.length} items | path: ${path} | run total: ${totalListItems} items, DB: ${totalInserted} inserted, ${totalUpdated} updated`
        )
        if (typeof onProgress === 'function') {
          onProgress(pi + 1, totalProvinces, {
            lastPageByProvince: { ...lastPageByProvince },
          })
        }
      } catch (err) {
        logger.warn(
          `[bds.com.vn] [${logLabel}] Page ${page} failed (path: ${path})`,
          { err: err.message }
        )
        break
      }
    }
    if (typeof onProgress === 'function') {
      onProgress(pi + 1, totalProvinces, {
        lastPageByProvince: { ...lastPageByProvince },
      })
    }
  }
  await flush()
  logger.info(
    `[bds.com.vn] List-by-provinces done | provinces: ${totalProvinces} | items: ${totalListItems} | DB: ${totalInserted} inserted, ${totalUpdated} updated`
  )
  return {
    totalListItems,
    provincesCount: totalProvinces,
    inserted: totalInserted,
    updated: totalUpdated,
  }
}

/**
 * Crawl detail cho các post có detailFetched=false và detailHref có giá trị.
 * @param {object} [opts]
 * @param {number} [opts.batchSize=100]
 * @param {function} [opts.onProgress] - (processed, total)
 * @returns {Promise<{ processed: number }>}
 */
export async function crawlDetailForPendingPosts(opts = {}) {
  const { batchSize = 100, onProgress } = opts
  const Post = getPostModel()
  const pending = await Post.find({
    detailFetched: false,
    detailHref: { $exists: true, $nin: [null, ''] },
  })
    .sort({ createdAt: 1 })
    .limit(batchSize)
    .lean()
  const total = pending.length
  if (total === 0) {
    logger.info('[bds.com.vn] No pending posts for detail crawl')
    return { processed: 0 }
  }
  logger.info(`[bds.com.vn] Fetching detail for ${total} pending posts`)
  let processed = 0
  for (let i = 0; i < pending.length; i += 1) {
    const post = pending[i]
    const raw =
      post.listRaw && typeof post.listRaw === 'object'
        ? post.listRaw
        : {
            href: post.detailHref,
            subId: post.subId,
            slug: post.slug,
            title: post.title,
            priceText: '',
            areaText: '',
            locationText: '',
            dateText: '',
            description: '',
          }
    if (DETAIL_FETCH_DELAY_MS > 0 && i > 0) {
      await new Promise(r => setTimeout(r, DETAIL_FETCH_DELAY_MS))
    }
    const detail = await fetchDetail(post.detailHref)
    try {
      const fullPost = mapToPost(raw, detail)
      await Post.updateOne(
        { _id: post._id },
        {
          $set: {
            ...fullPost,
            detailFetched: true,
            source: post.source || CRAWLER_SOURCE,
          },
          $unset: { listRaw: '' },
        }
      )
      processed += 1
    } catch (err) {
      logger.warn(`[bds.com.vn] Detail map/update failed subId=${post.subId}`, {
        err: err.message,
      })
    }
    if (
      typeof onProgress === 'function' &&
      ((i + 1) % 10 === 0 || i + 1 === total)
    ) {
      onProgress(i + 1, total)
    }
  }
  logger.info(`[bds.com.vn] Detail crawl done: ${processed}/${total} updated`)
  return { processed }
}

/**
 * Lưu danh sách post cào được vào DB.
 * Check trùng bằng ID nguồn (source + subId): có thì update, chưa có thì insert.
 * subId = ID gốc từ URL bds.com.vn (ví dụ ...-p799581.html → subId '799581').
 * @param {Array<object>} posts - payload từ mapToPost (phải có subId)
 * @param {string} source
 * @returns {Promise<{ inserted: number, updated: number }>}
 */
async function saveCrawledPosts(posts, source = CRAWLER_SOURCE) {
  if (!posts.length) return { inserted: 0, updated: 0 }
  const Post = getPostModel()
  const ops = posts.map(post => ({
    updateOne: {
      filter: { source, subId: post.subId },
      update: { $set: { ...post, source } },
      upsert: true,
    },
  }))
  const result = await Post.bulkWrite(ops)
  return {
    inserted: result.upsertedCount ?? 0,
    updated: result.modifiedCount ?? 0,
  }
}

const DEFAULT_CHUNK_SIZE = 20

/**
 * Worker chính: crawl listing từng trang -> (optional) detail -> map -> lưu ngay theo chunk (stream-to-DB, tránh mất dữ liệu khi crash).
 * @param {object} [opts]
 * @param {number} [opts.maxListPages]
 * @param {number} [opts.limit] - giới hạn số item (để test nhanh)
 * @param {boolean} [opts.fetchDetails]
 * @param {boolean} [opts.saveToDb]
 * @param {number} [opts.chunkSize] - size batch khi lưu DB
 * @param {function} [opts.onProgress] - (processed, total, stage) khi lưu từng chunk
 * @returns {Promise<{ posts: Array<object>, inserted: number, updated: number, totalProcessed: number }>}
 */
export default async function webScrapingWorker(opts = {}) {
  const {
    maxListPages = MAX_LIST_PAGES,
    limit,
    fetchDetails = false,
    saveToDb = true,
    chunkSize = DEFAULT_CHUNK_SIZE,
    onProgress,
  } = opts

  logger.info('[bds.com.vn] Starting crawl (cho-thue-nha-dat)', {
    maxListPages: maxListPages ?? 'full',
    limit: limit ?? 'none',
    streamToDb: true,
  })
  const seenSubIds = new Set()
  let totalProcessed = 0
  let totalInserted = 0
  let totalUpdated = 0
  const saveBuffer = []
  const flush = async () => {
    if (saveBuffer.length === 0) return
    const { inserted, updated } = await saveCrawledPosts(saveBuffer)
    totalInserted += inserted
    totalUpdated += updated
    const from = totalProcessed - saveBuffer.length + 1
    logger.info(
      `[bds.com.vn] Saving to DB: ${saveBuffer.length} items (${from}-${totalProcessed})`
    )
    saveBuffer.length = 0
  }

  const DETAIL_PROGRESS_LOG_EVERY = 10
  for (let page = 1; ; page += 1) {
    if (
      typeof maxListPages === 'number' &&
      maxListPages > 0 &&
      page > maxListPages
    )
      break
    if (typeof limit === 'number' && limit > 0 && totalProcessed >= limit) break

    const path = page === 1 ? LIST_PATH : `${LIST_PATH}-page${page}`
    let items = []
    try {
      const { data } = await axiosInstance.get(path)
      items = parseListingPage(data, BASE_URL)
      for (const raw of items) {
        if (seenSubIds.has(raw.subId)) continue
        if (typeof limit === 'number' && limit > 0 && totalProcessed >= limit)
          break
        seenSubIds.add(raw.subId)

        let detail = null
        if (fetchDetails && raw.href) {
          if (DETAIL_FETCH_DELAY_MS > 0)
            await new Promise(r => setTimeout(r, DETAIL_FETCH_DELAY_MS))
          detail = await fetchDetail(raw.href)
          if ((totalProcessed + 1) % DETAIL_PROGRESS_LOG_EVERY === 0) {
            logger.info(
              `[bds.com.vn] Detail progress: ${totalProcessed + 1} (subId=${raw.subId})`
            )
          }
        }
        try {
          const post = mapToPost(raw, detail)
          totalProcessed += 1
          if (saveToDb) {
            saveBuffer.push(post)
            if (saveBuffer.length >= chunkSize) {
              await flush()
              if (typeof onProgress === 'function')
                onProgress(totalProcessed, null, 'save')
            }
          }
        } catch (err) {
          logger.warn(`[bds.com.vn] Map failed for subId=${raw.subId}`, {
            err: err.message,
          })
        }
      }
      if (
        typeof onProgress === 'function' &&
        totalProcessed > 0 &&
        totalProcessed % DETAIL_PROGRESS_LOG_EVERY === 0
      ) {
        onProgress(totalProcessed, null, 'detail')
      }
      logger.info(
        `[bds.com.vn] List page ${page}: ${items.length} items (total processed: ${totalProcessed})`
      )
      if (
        items.length === 0 ||
        (typeof limit === 'number' && limit > 0 && totalProcessed >= limit)
      )
        break
    } catch (err) {
      logger.warn(`[bds.com.vn] List page ${page} failed`, { err: err.message })
      break
    }
  }

  if (saveBuffer.length > 0) await flush()
  if (typeof onProgress === 'function' && totalProcessed > 0)
    onProgress(totalProcessed, totalProcessed, 'save')
  logger.info(
    `[bds.com.vn] Crawl done: ${totalProcessed} processed, ${totalInserted} inserted, ${totalUpdated} updated`
  )
  return {
    posts: [],
    inserted: totalInserted,
    updated: totalUpdated,
    totalProcessed,
  }
}
