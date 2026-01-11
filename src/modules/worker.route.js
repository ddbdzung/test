import { Router } from 'express'

import { APP_NAME, HTTP_STATUS } from '@/core/constants'
import { HttpResponse, logger } from '@/core/helpers'

import { wrapController } from '@/framework/middleware'

import webScrapingWorker from '@/modules/bds.com.vn/worker'

const router = Router()

router.get(
  '/ping',
  wrapController(async () => {
    const rootDir = process.cwd()
    const version = await import(`${rootDir}/package.json`)
    return new HttpResponse(
      HTTP_STATUS.OK.code,
      {
        version: version?.version || 'unknown',
        lastDeployedAt: global.lastDeployedAt || 'unknown',
      },
      `${APP_NAME.WORKER}: pong`
    )
  })
)

router.post(
  '/bds.com.vn/run',
  wrapController(async () => {
    logger.info('Starting bds.com.vn worker')
    await webScrapingWorker()
    return new HttpResponse(HTTP_STATUS.OK.code, 'Bds.com.vn worker started')
  })
)

export default router
