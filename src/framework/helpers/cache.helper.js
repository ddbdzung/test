import config from '@/configs'
import crypto from 'crypto'

import { CURRENT_ENV, ENVIRONMENT } from '@/core/constants'
import { InternalServerError, logger } from '@/core/helpers'
import { mergeOptions } from '@/core/utils'

import { getClient } from '@/framework/helpers/redis.helper'

const flatten = (obj, prefix = '') => {
  return Object.keys(obj).reduce((acc, k) => {
    const value = obj[k]
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof value === 'object' && !Array.isArray(value))
      Object.assign(acc, flatten(value, key))
    else acc[key] = Array.isArray(value) ? value.join(',') : value
    return acc
  }, {})
}

const buildQueryParams = (params, encoded = true) => {
  const flat = flatten(params)
  const parts = Object.keys(flat)
    .sort()
    .map(k => `${k}=${flat[k]}`)
  const raw = parts.join('|')
  return encoded ? crypto.createHash('md5').update(raw).digest('hex') : raw
}

const buildKey = ({ model, alias, userId, queryParams }) => {
  // ✅ Serialize queryParams một cách deterministic
  // ✅ Build key với delimiter rõ ràng
  const keyParts = [
    { key: 'model', value: model },
    { key: 'alias', value: alias },
    { key: 'userId', value: userId },
    {
      key: 'query',
      value: buildQueryParams(
        queryParams,
        CURRENT_ENV === ENVIRONMENT.PRODUCTION
      ),
    },
  ]
    .filter(item => item.value)
    .map(item => `${item.key}=${item.value}`) // Loại bỏ empty strings

  return `${config.redis.cachePrefix}_${config.service}:${keyParts.join(':')}`
}

/**
 * @param {Object} options
 * @param {string} [options.model]
 * @param {number} [options.expire=300] - Expire time of cache in seconds
 * @param {Object} [options.data = {}] - Data to cache
 * @param {string} [options.alias] - Alias of cache key
 * @param {string | null} [options.userId]
 * @param {Object} [options.queryParams = {}]
 * @returns {Promise<{ success: true, key: string, expire: number, error: null } | { success: false, error: Error }>}
 */
export const setCache = async options => {
  const { model, expire, data, alias, userId, queryParams } = mergeOptions(
    options,
    {
      model: undefined,
      expire: 0, // Mean no expire
      data: {},
      alias: undefined,
      userId: undefined,
      queryParams: {},
    }
  )

  if (expire < 0) {
    return {
      success: false,
      error: new InternalServerError(
        'expire must be greater than or equal to 0',
        null,
        {
          context: {
            expire,
          },
        }
      ),
    }
  }

  if (!model && !alias) {
    return {
      success: false,
      error: new InternalServerError('model or alias is required', null, {
        context: { model, alias },
      }),
    }
  }

  try {
    const key = buildKey({ model, alias, userId, queryParams })
    let serializedData
    try {
      serializedData = JSON.stringify({
        ...data,
        _cachedAt: Date.now(),
        _expire: expire,
      })
    } catch (serializeError) {
      logger.error('setCache: JSON serialization failed', {
        error: serializeError,
        model,
        service: config.service,
      })
      return { success: false, error: serializeError }
    }

    // ✅ Check size (Redis default max: 512MB)
    const sizeInMB = Buffer.byteLength(serializedData, 'utf8') / (1024 * 1024)
    if (sizeInMB > 100) {
      // Warning threshold
      logger.warn('setCache: Large cache entry', {
        key,
        sizeMB: sizeInMB.toFixed(2),
      })
    }

    const client = await getClient()
    const options = {}
    if (expire && expire > 0)
      options.expiration = {
        type: 'EX',
        value: expire,
      }

    await client.set(key, serializedData, options)

    return { success: true, key, expire, error: null }
  } catch (error) {
    logger.error('cacheHelper.setCache', {
      error,
      model,
      service: config.service,
      userId,
    })

    return { success: false, error }
  }
}

/**
 * @param {Object} options
 * @param {string} [options.model]
 * @param {string} [options.alias] - Alias of cache key
 * @param {string | null} [options.userId]
 * @param {Object} [options.queryParams = {}]
 */
export const getCache = async options => {
  const { model, alias, userId, queryParams } = mergeOptions(options, {
    model: undefined,
    alias: undefined,
    userId: undefined,
    queryParams: {},
  })

  if (!model && !alias) {
    return {
      success: false,
      error: new InternalServerError('model or alias is required', null, {
        context: { model, alias },
      }),
      data: null,
    }
  }

  const client = await getClient()
  const result = await client.get(
    buildKey({
      model,
      alias,
      userId,
      queryParams,
    })
  )

  try {
    return {
      success: true,
      data: JSON.parse(result),
      error: null,
    }
  } catch (error) {
    logger.error('cacheHelper.getCache', error)
    return {
      success: false,
      data: null,
      error: error,
    }
  }
}

/**
 * @param {Object} options
 * @param {string} [options.model]
 * @param {string} [options.alias] - Alias of cache key
 * @param {string | null} [options.userId]
 * @param {Object} [options.queryParams = {}]
 */
export const delCache = async options => {
  const { model, alias, userId, queryParams } = mergeOptions(options, {
    model: undefined,
    alias: undefined,
    userId: undefined,
    queryParams: {},
  })

  if (!model && !alias) {
    return {
      success: false,
      error: new InternalServerError('model or alias is required', null, {
        context: { model, alias },
      }),
    }
  }

  const client = await getClient()
  const result = await client.del(
    buildKey({
      model,
      alias,
      userId,
      queryParams,
    })
  )

  return {
    success: Boolean(result),
    error: null,
  }
}
