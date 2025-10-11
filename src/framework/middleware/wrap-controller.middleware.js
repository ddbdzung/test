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
    try {
      const result = await Promise.race([
        controllerFn(req, res, next),
        snooze(timeout).then(() => {
          return new BaseError('Request timeout', {
            statusCode: HTTP_STATUS.REQUEST_TIMEOUT,
          })
        }),
      ])

      // Nếu controller đã gửi response
      if (res.headersSent) return

      if (result instanceof HttpResponse) {
        return res.status(result.statusCode).json(result.toJSON())
      }

      if (result instanceof BaseError) {
        return next(result)
      }

      if (result !== undefined) {
        return res.json(new HttpResponse(result).toJSON())
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}
