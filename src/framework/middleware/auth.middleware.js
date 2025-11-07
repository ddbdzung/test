import { UnauthorizedError } from '@/core/helpers'

import {
  getBiz,
  getSmaxAppBackdoorData,
  // getSmaxFnbBackdoorData,
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

export const backdoorAuth = async (req, res, next) => {
  try {
    if (!req.headers?.authorization) {
      next(new UnauthorizedError())
      return
    }

    req.backdoor = await getSmaxAppBackdoorData(req.headers?.authorization)
    // req.backdoor = await getSmaxFnbBackdoorData(req.headers?.authorization)
    next()
  } catch (error) {
    next(error)
  }
}
