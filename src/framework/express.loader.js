import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

import { ValidationError, logger } from '@/core/helpers'

import { addResponseTime } from '@/framework/middleware/add-response-time.middleware'
import { errorHandler } from '@/framework/middleware/error-handler.middleware'
import { i18nMiddleware } from '@/framework/middleware/localize.middleware'
import { notFound } from '@/framework/middleware/not-found.middleware'
import { requestContext } from '@/framework/middleware/request-context.middleware'
import { requestLogger } from '@/framework/middleware/request-logger.middleware'

export const createApp = (name, callback = () => {}) => {
  logger.info(`Creating Express Application '${name}'...`)
  const app = express()

  app.use(i18nMiddleware())
  app.use(
    requestContext({
      extractUserId: req => req.user?.id,
    })
  )
  app.use(requestLogger)
  app.use(addResponseTime)

  app.use(cors())
  app.use(compression())
  app.use(helmet())

  app.use(express.json())
  app.use((err, _req, _res, next) => {
    // Handle JSON body parsing error
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      next(new ValidationError('Invalid JSON format in request body'))
      return
    }

    next(err)
  })
  app.use(
    express.urlencoded({
      extended: true,
      limit: '1mb',
      parameterLimit: 500,
    })
  )

  callback(app)

  app.use(notFound)
  app.use(errorHandler)

  logger.info(`✅ Express Application '${name}' created successfully`)
  return app
}
