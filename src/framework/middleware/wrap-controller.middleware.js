import { TIMEOUT_CONTROLLER } from '@/core/constants/common.constant'
import { HTTP_STATUS } from '@/core/constants/http-status.constant'
import { BaseError } from '@/core/helpers/error.helper'
import { HttpResponse } from '@/core/helpers/http-response.helper'
import { ensureObject, snooze } from '@/core/utils/common.util'

export const wrapController = (controllerFn, options = {}) => {
  // Validate
  if (typeof controllerFn !== 'function') {
    throw new BaseError('Controller function is required', {
      isOperational: false,
    })
  }

  options = ensureObject(options, { timeout: TIMEOUT_CONTROLLER.DEFAULT })

  // Process
  const { timeout = TIMEOUT_CONTROLLER.DEFAULT } = options

  return async (req, res, next) => {
    if (res.headersSent) return next()

    try {
      const result = await Promise.race([
        controllerFn(req, res, next),
        snooze(timeout).then(() => {
          return new BaseError('Request timeout', {
            statusCode: HTTP_STATUS.REQUEST_TIMEOUT,
          })
        }),
      ])

      if (result instanceof HttpResponse) {
        res.status(result.statusCode).json(result.toJSON())
        return next()
      }

      if (result instanceof BaseError) {
        return next(result)
      }

      if (result === undefined) {
        res.json(new HttpResponse().toJSON())
        return next()
      }

      res.json(new HttpResponse(HTTP_STATUS.OK, result).toJSON())
      next()
    } catch (error) {
      next(error)
    }
  }
}
