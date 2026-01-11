import config from '@/configs'

import { API_PREFIX, APP_NAME } from '@/core/constants/common.constant'
import logger from '@/core/helpers/logger.helper'

import { createApp } from '@/framework/express.loader'
import { connectMongoDB } from '@/framework/helpers'
import { setupGracefulShutdown } from '@/framework/shutdown.helper'

import workerRoutes from '@/modules/worker.route'

const app = createApp(APP_NAME.WORKER, app => {
  app.use(`/${API_PREFIX}`, workerRoutes)
})

let server = null
try {
  server = app.listen(config.portWorker, async () => {
    await connectMongoDB(
      config.mongo.connections.main.uri,
      config.mongo.connections.main.options
    )

    logger.info(
      `Server '${APP_NAME.WORKER}' is running on port ${config.portWorker}`
    )
    global.lastDeployedAt = new Date().toISOString()
  })

  server.on('error', err => {
    logger.error(`Failed to start server '${APP_NAME.WORKER}'`, { err })
    process.exit(1)
  })

  setupGracefulShutdown(server)
} catch (err) {
  logger.error(`Failed to start server '${APP_NAME.WORKER}'`, { err })
  process.exit(1)
}

export default server
