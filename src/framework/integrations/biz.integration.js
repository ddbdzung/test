import { isAxiosError } from 'axios'

import { HTTP_STATUS } from '@/core/constants'
import {
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from '@/core/helpers'

import { getCache, setCache } from '@/framework/helpers'
import { $get, $post } from '@/framework/helpers/axios.helper'

/**
 * @typedef {Object} BizAuthMiddlewareResponse
 * @property {number} status
 * @property {string} statusText
 * @property {Biz} data
 * @property {Viewer} viewer
 * @property {Setting} setting
 * @property {number} [_cachedAt]
 * @property {number} [_expire]
 */

/**
 * Get a business by alias
 * @param {string} bizAlias - The alias of the business
 * @param {string} token - The token of the business
 * @returns {Promise<BizAuthMiddlewareResponse>}
 * @throws {NotFoundError}
 * @throws {UnauthorizedError}
 * @throws {InternalServerError}
 */
export const getBiz = async (bizAlias, token) => {
  try {
    const bufToken = token?.split('.')?.[1]
    const dataToken = JSON.parse(Buffer.from(bufToken, 'base64').toString())
    const cachedBiz = await getCache({
      model: 'biz',
      alias: bizAlias,
      queryParams: { authorization: dataToken.id },
    })

    if (cachedBiz.success && cachedBiz.data) {
      return cachedBiz.data
    }

    const response = await $get(`bizs/${bizAlias}`, {
      headers: {
        authorization: token,
      },
    })

    const { status, data, message } = response

    if (response.status !== HTTP_STATUS.OK) {
      throw new InternalServerError('', null, {
        response,
      })
    }

    await setCache({
      model: 'biz',
      alias: bizAlias,
      data,
      expire: 120, // 2 minutes
      queryParams: { authorization: dataToken.id },
    })

    if (status !== HTTP_STATUS.OK) {
      throw new InternalServerError(message, null, {
        response,
      })
    }

    return data
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.status === HTTP_STATUS.NOT_FOUND) {
        throw new NotFoundError('Biz', bizAlias)
      }

      if (error.status === HTTP_STATUS.UNAUTHORIZED) {
        throw new UnauthorizedError()
      }

      throw new InternalServerError('', error)
    }

    throw new InternalServerError('', error)
  }
}

export const getSmaxAppBackdoorData = async backdoorToken => {
  try {
    const raw = await $get('backdoors/verify', {
      headers: { authorization: backdoorToken },
    })

    if (raw.data?.status !== HTTP_STATUS.OK) {
      throw new InternalServerError('', null, {
        response: raw.data,
      })
    }

    return raw.data.data
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.status === HTTP_STATUS.UNAUTHORIZED) {
        throw new UnauthorizedError()
      }

      throw new InternalServerError('', error)
    }

    throw new InternalServerError('', error)
  }
}

export const getSmaxFnbBackdoorData = async backdoorToken => {
  try {
    const raw = await $post(
      'backdoor',
      [{ method: 'authService', query: { backdoorToken } }],
      { headers: { authorization: `Bearer ${backdoorToken}` } }
    )

    if (!raw.data?.[0]?.response) {
      throw new InternalServerError('Invalid API response format')
    }

    const resp = raw.data[0]?.response || {}
    const { status, data, message } = resp

    if (status !== HTTP_STATUS.OK || !data) {
      throw new InternalServerError(message || 'Backdoor not found', null, {
        response: resp,
      })
    }

    return data
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.status === HTTP_STATUS.UNAUTHORIZED) {
        throw new UnauthorizedError()
      }

      throw new InternalServerError('', error)
    }

    throw new InternalServerError('', error)
  }
}
