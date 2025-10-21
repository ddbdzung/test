/*
 * Author: Dzung Dang
 */
import { requestContextHelper } from '@/core/helpers'

export const addResponseTime = (req, res, next) => {
  const originalWriteHead = res.writeHead

  res.writeHead = function (...args) {
    const ctx = requestContextHelper.getContext()

    if (ctx && !res.headersSent) {
      const endTime = process.hrtime.bigint()
      const durationMs = Number(endTime - ctx.startTime) / 1e6

      res.setHeader('X-Response-Time', `${durationMs.toFixed(4)}`)
    }

    return originalWriteHead.apply(this, args)
  }

  next()
}
