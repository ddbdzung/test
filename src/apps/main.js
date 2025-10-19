import config from '@/configs'

import { API_PREFIX, APP_NAME } from '@/core/constants/common.constant'
import logger from '@/core/helpers/logger.helper'

import { createApp } from '@/framework/express.loader'
import { setupGracefulShutdown } from '@/framework/shutdown.helper'

import mainRoutes from '@/modules/main.route'

const app = createApp(APP_NAME.MAIN, app => {
  app.use(`/${API_PREFIX}`, mainRoutes)
})

const server = app.listen(config.port, err => {
  if (err) {
    logger.error(`Failed to start server '${APP_NAME.MAIN}'`, { err })
    process.exit(1)
  }

  logger.info(`Server '${APP_NAME.MAIN}' is running on port ${config.port}`)
})

setupGracefulShutdown(server)

export default server
