import { CURRENT_ENV, ENVIRONMENT } from '@/core/constants/common.constant'
import { HTTP_STATUS } from '@/core/constants/http-status.constant'
import {
  DEFAULT_ERROR_CODE,
  DEFAULT_ERROR_MESSAGE,
  DEFAULT_ERROR_NAME,
} from '@/core/constants/message.constant'
import { BaseError } from '@/core/helpers/error.helper'
import { HttpResponse } from '@/core/helpers/http-response.helper'
import logger from '@/core/helpers/logger.helper'

export const errorHandler = (err, req, res, next) => {
  const isProduction = CURRENT_ENV === ENVIRONMENT.PRODUCTION
  try {
    if (!err || res.headersSent) {
      next()
      return
    }

    if (err instanceof HttpResponse) {
      res.status(err.statusCode).json(err.toJSON())
      next()
      return
    }

    if (err instanceof BaseError) {
      res.status(err.statusCode).json(err.toJSON())
      next()
      return
    }

    // Unhandled errors below
    if (err instanceof Error) {
      logger.debug('UNHANDLED_ERROR', { err })

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: isProduction ? DEFAULT_ERROR_MESSAGE : err.message,
        name: isProduction ? DEFAULT_ERROR_NAME : err.name,
        code: isProduction ? DEFAULT_ERROR_CODE : err.code,
        stack: isProduction ? undefined : err.stack,
      })
      next()
      return
    }

    logger.error('UNHANDLED_ERROR', { err })
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: DEFAULT_ERROR_MESSAGE,
      name: DEFAULT_ERROR_NAME,
      code: DEFAULT_ERROR_CODE,
    })
    next()
  } catch (error) {
    // Unknown error
    logger.error('UNKNOWN_ERROR', { error })
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: DEFAULT_ERROR_MESSAGE,
      name: DEFAULT_ERROR_NAME,
      code: DEFAULT_ERROR_CODE,
    })
    next()
  }
}
