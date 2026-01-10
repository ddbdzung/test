/*
 * Author: Dzung Dang
 */
import process from 'process'

import { logger } from '@/core/helpers'

const cleanupTasks = new Set()
let isInitialized = false
let isShuttingDown = false

/**
 * Đăng ký cleanup task từ bất kỳ module nào.
 * @param {Function} fn - async hoặc sync function
 * @param {string} [label] - mô tả ngắn (để log)
 */
export function registerShutdownTask(fn, label = 'anonymous-task') {
  cleanupTasks.add({ fn, label })
  logger.debug(`🧩 Registered shutdown task: ${label}`)
}

/**
 * Khởi tạo hệ thống graceful shutdown
 * @param {http.Server} server - Express hoặc HTTP server
 * @param {object} [options]
 * @param {number} [options.timeoutMs=10000]
 */
export function setupGracefulShutdown(server, options = {}) {
  if (isInitialized) {
    logger.warn(
      '⚠️ setupGracefulShutdown already called — skipping duplicate init'
    )
    return
  }
  isInitialized = true

  const { timeoutMs = 10000 } = options

  const shutdown = async signal => {
    if (isShuttingDown) {
      logger.warn(`Duplicate ${signal} received — already shutting down...`)
      return
    }
    isShuttingDown = true

    logger.info(`${signal} received — starting graceful shutdown...`)

    // Step 1: Stop accepting new requests
    const closeServer = new Promise(resolve => {
      server.close(() => {
        logger.info('✅ HTTP server closed (no longer accepting new requests)')
        resolve()
      })
    })

    // Step 2: Execute registered cleanup tasks
    const runAllCleanup = async () => {
      let i = 1
      for (const { fn, label } of cleanupTasks) {
        try {
          await fn()
          logger.info(`✅ Cleanup task[${i}] "${label}" completed`)
        } catch (err) {
          logger.error(
            `❌ Cleanup task[${i}] "${label}" failed: ${err.message}`,
            err
          )
        }
        i++
      }
    }

    // Step 3: Race with timeout to prevent hanging
    try {
      await Promise.race([
        (async () => {
          await closeServer
          await runAllCleanup()
        })(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Graceful shutdown timeout')),
            timeoutMs
          )
        ),
      ])
      logger.info('🧹 Graceful shutdown completed successfully')
      process.exit(0)
    } catch (err) {
      logger.error(`⚠️ Graceful shutdown failed or timed out: ${err.message}`)
      process.exit(1)
    }
  }

  // Step 4: Register OS and crash signals
  const signals = ['SIGTERM', 'SIGINT', 'SIGHUP']
  signals.forEach(sig => process.on(sig, () => shutdown(sig)))

  process.on('uncaughtException', err => {
    logger.error('💥 Uncaught Exception:', err)
    // Should exit process immediately
    process.exit(1)
  })
  process.on('unhandledRejection', reason => {
    logger.error('💥 Unhandled Rejection:', reason)
    shutdown('unhandledRejection')
  })

  logger.info('✅ Graceful shutdown handler initialized')
}
