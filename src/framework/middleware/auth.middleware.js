import { UnauthorizedError } from '@/core/helpers'

import {
  getBackdoorData,
  getBiz,
} from '@/framework/integrations/biz.integration'

/**
 * Middleware to authenticate a business
 * @throws {UnauthorizedError}
 * @throws {InternalServerError}
 */
export const bizAuth = () => async (req, res, next) => {
  try {
    const token = req.headers.authorization

    if (!token) {
      next(new UnauthorizedError())
      return
    }

    const bizResponse = await getBiz(req.params.bizAlias, token)

    req.biz = bizResponse.data
    req.viewer = bizResponse.viewer
    next()
  } catch (error) {
    next(error)
  }
}

export const backdoorAuth = () => async (req, res, next) => {
  try {
    if (!req.headers?.authorization) {
      next(new UnauthorizedError())
      return
    }

    const backdoorData = await getBackdoorData(
      req.headers.authorization?.replace('Bearer', '')?.trim()
    )

    req.backdoor = backdoorData
    next()
  } catch (error) {
    next(error)
  }
}
