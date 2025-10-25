/*
 * Author: Dzung Dang
 */
import {
  CURRENT_ENV,
  DEFAULT_ERROR_CODE,
  DEFAULT_ERROR_MESSAGE,
  DEFAULT_ERROR_NAME,
  ENVIRONMENT,
  HTTP_STATUS,
} from '@/core/constants'
import { BaseError, HttpResponse, logger } from '@/core/helpers'

const safeErrorResp = {
  message: DEFAULT_ERROR_MESSAGE,
  name: DEFAULT_ERROR_NAME,
  code: DEFAULT_ERROR_CODE,
}

export const errorHandler = (err, _req, res, next) => {
  const isProduction = CURRENT_ENV === ENVIRONMENT.PRODUCTION
  try {
    if (!err || res.headersSent) {
      next()
      return
    }

    if (err instanceof HttpResponse) {
      // No need to hide sensitive information cause HttpResponse is not an error
      res.status(err.statusCode).json(err.toJSON())
      next()
      return
    }

    if (err instanceof BaseError) {
      const resp = err.toJSON()
      // Hide sensitive information in production, only log
      if (isProduction && err.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
        logger.error('HANDLED_ERROR', resp)
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(safeErrorResp)
        next()
        return
      }

      res.status(resp.statusCode).json(resp)
      next()
      return
    }

    // Hide sensitive information in production, only log
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    if (err instanceof Error) {
      if (isProduction) {
        logger.error('UNHANDLED_ERROR', { err })
        res.json(safeErrorResp)
        next()
        return
      }

      res.json({
        message: err.message,
        name: err.name,
        code: err.code,
        stack: err.stack,
      })
      next()
      return
    }

    logger.error('UNHANDLED_ERROR', { err })
    res.json(safeErrorResp)
    next()
  } catch (error) {
    // Unknown error
    logger.error('UNKNOWN_ERROR', { error })
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(safeErrorResp)
    next()
  }
}
