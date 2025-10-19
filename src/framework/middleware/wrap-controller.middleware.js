import {
  HTTP_STATUS,
  HTTP_STATUS_MESSAGE,
  TIMEOUT_CONTROLLER,
} from '@/core/constants'
import { BaseError, HttpResponse } from '@/core/helpers'
import { ensureObject, snooze } from '@/core/utils'

export const wrapController = (controllerFn, options) => {
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
    if (res.headersSent) {
      next()
      return
    }

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
        next()
        return
      }

      if (result instanceof BaseError) {
        next(result)
        return
      }

      if (result === undefined) {
        res.json(new HttpResponse().toJSON())
        next()
        return
      }

      res.json(
        new HttpResponse(
          HTTP_STATUS.OK,
          result,
          HTTP_STATUS_MESSAGE.OK
        ).toJSON()
      )
      next()
    } catch (error) {
      // Error thrown from controller fn so it's operational error
      next(error)
    }
  }
}
