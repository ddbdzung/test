import { requestValidator } from '@/framework/middleware/request-validator.middleware'
import express from 'express'

import logger from '@/core/helpers/logger.helper'
import { Joi } from '@/core/helpers/validator.helper'

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

app.post(
  '/',
  requestValidator(schema, { removeUnknown: false }),
  (req, res) => {
    logger.debug('req', {
      query: req.query,
      body: req.body,
      params: req.params,
    })
    res.json({
      query: req.query,
      body: req.body,
      params: req.params,
    })
  }
)

app.listen(config.port, () => {
  console.log('Server is running on port ' + config.port)
})
