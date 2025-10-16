import config from '@/configs'
import { createApp } from '@/framework/express.loader'
import { requestValidator } from '@/framework/middleware/request-validator.middleware'
import { wrapController } from '@/framework/middleware/wrap-controller.middleware'
import { setupGracefulShutdown } from '@/framework/shutdown.helper'

import { APP_NAME } from '@/core/constants/common.constant'
import logger from '@/core/helpers/logger.helper'
import { requestContextHelper } from '@/core/helpers/request-context.helper'
import { Joi } from '@/core/helpers/validator.helper'
import { snooze } from '@/core/utils/common.util'

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
  console.log('ctx', ctx)
  new Promise(resolve => {
    setTimeout(() => {
      const contextX = requestContextHelper.getContext()
      console.log('contextX', contextX)
      resolve(contextX)
    }, 3000)
  })

  await snooze(3000)
  res.json({
    query: req.query,
    body: req.body,
    params: req.params,
  })
}

const app = createApp(APP_NAME.MAIN, app => {
  app.post(
    '/',
    requestValidator(schema, { removeUnknown: false }),
    wrapController(controllerFn)
  )
})

const server = app.listen(config.port, err => {
  if (err) {
    logger.error('Failed to start server', { err })
    process.exit(1)
  }

  logger.info('Server is running on port ' + config.port)
})

setupGracefulShutdown(server)

export default server
