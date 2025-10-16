import config from '@/configs'
import { requestContextHelper } from '@/framework/helpers/request-context.helper'
import { requestContext } from '@/framework/middleware/request-context.middleware'
import { requestLogger } from '@/framework/middleware/request-logger.middleware'
import { requestValidator } from '@/framework/middleware/request-validator.middleware'
import { securityHeaders } from '@/framework/middleware/security-header.middleware'
import { wrapController } from '@/framework/middleware/wrap-controller.middleware'
import express from 'express'

import { HTTP_STATUS } from '@/core/constants/http-status.constant'
import { BaseError } from '@/core/helpers/error.helper'
import logger from '@/core/helpers/logger.helper'
import { Joi } from '@/core/helpers/validator.helper'
import { snooze } from '@/core/utils/common.util'

const app = express()

app.use(express.json())
app.use(securityHeaders)

const input = {
  query: {
    constructor: 'helo',
    name: 'haha',
    __proto__: 12,
    prototype: 3,
  },
  body: {
    constructor: 'helo',
    name: 'haha',
    __proto__: 12,
    prototype: 3,
    age: 18,
  },
}
const schema = {
  query: Joi.object({
    name: Joi.string().optional(),
  }).unknown(true),
  body: Joi.object({
    name: Joi.string().optional(),
    age: Joi.number().optional(),
  }).unknown(true),
}

const controllerFn = async (req, res, next) => {
  logger.debug('req', {
    query: req.query,
    body: req.body,
    params: req.params,
  })

  const ctx = requestContextHelper.getContext()
  console.log(ctx)

  await snooze(3000)
  res.json({
    query: req.query,
    body: req.body,
    params: req.params,
  })
}

app.use(
  requestContext({
    extractUserId: req => req.user?.id,
  })
)
app.use(requestLogger)

app.post(
  '/',
  requestValidator(schema, { removeUnknown: false }),
  wrapController(controllerFn)
)

app.use((err, req, res, next) => {
  if (res.headersSent) {
    next()
    return
  }

  if (err instanceof BaseError) {
    console.log(err.toJSON())
    res.status(err.statusCode).json(err.toJSON())
    return
  }

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(err)
  next()
})

app.listen(config.port, () => {
  console.log('Server is running on port ' + config.port)
})
