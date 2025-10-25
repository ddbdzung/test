/*
 * Author: Dzung Dang
 */
import {
  HTTP_STATUS,
  HTTP_STATUS_MESSAGE,
  TIMEOUT_CONTROLLER,
} from '@/core/constants'
import { BaseError, HttpResponse, InternalServerError } from '@/core/helpers'
import { mergeOptions, snooze } from '@/core/utils'

export const wrapController = (controllerFn, options) => {
  // Validate
  if (typeof controllerFn !== 'function') {
    throw new InternalServerError('Controller function is required', {
      isOperational: false,
    })
  }

  const { timeout } = mergeOptions(options, {
    timeout: TIMEOUT_CONTROLLER.DEFAULT,
  })

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

      const convenientHttpStatusCode =
        req?.method === 'POST' ? HTTP_STATUS.CREATED : HTTP_STATUS.OK

      if (result === undefined) {
        res.json(new HttpResponse(convenientHttpStatusCode).toJSON())
        next()
        return
      }

      res.json(
        new HttpResponse(
          convenientHttpStatusCode,
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
