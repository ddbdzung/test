import { requestValidator } from '@/framework/middleware/request-validator.middleware'
import { wrapController } from '@/framework/middleware/wrap-controller.middleware'
import express from 'express'

import { HTTP_STATUS } from '@/core/constants/http-status.constant'
import { BaseError } from '@/core/helpers/error.helper'
import logger from '@/core/helpers/logger.helper'
import { Joi } from '@/core/helpers/validator.helper'
import { snooze } from '@/core/utils/common.util'

import config from '@/configs/app.config'

const app = express()

app.use(express.json())

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

  await snooze(13000)
  res.json({
    query: req.query,
    body: req.body,
    params: req.params,
  })
}

app.post(
  '/',
  requestValidator(schema, { removeUnknown: false }),
  wrapController(controllerFn, { timeout: 2000 })
)

app.use((err, req, res, next) => {
  if (err instanceof BaseError) {
    console.log(err.toJSON())
    return res.status(err.statusCode).json(err.toJSON())
  }

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(err)
  next()
})

app.listen(config.port, () => {
  console.log('Server is running on port ' + config.port)
})
