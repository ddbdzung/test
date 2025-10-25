import config from '@/configs'
import { createClient } from 'redis'

import { InternalServerError, logger } from '@/core/helpers'

import { registerShutdownTask } from '@/framework/shutdown.helper'

// Module state
let client = null
let isConnecting = false
let connectionPromise = null

/**
 * Build Redis connection options from config
 * @returns {Object} Redis client options
 */
const buildRedisOptions = () => {
  const options = {
    socket: {
      reconnectStrategy: retries => Math.min(retries * 100, 3000),
      connectTimeout: 10000,
    },
  }

  if (config.redis.uri) {
    options.url = config.redis.uri
    return options
  }

  throw new InternalServerError('Redis URI is required')
}

/**
 * Connect to Redis server
 * @returns {Promise<Object>} Connected Redis client
 * @throws {Error} If connection fails
 */
export const connectRedis = async () => {
  const newClient = createClient(buildRedisOptions())

  newClient.on('error', err =>
    logger.error('❌ Redis: error', { err: err.message })
  )
  newClient.on('connect', () => logger.info('✅ Redis: connected!'))
  newClient.on('ready', () => logger.info('✅ Redis: ready!'))

  await newClient.connect()
  client = newClient
  return client
}

/**
 * Get Redis client instance (auto-connect if needed)
 * @returns {Promise<import('redis').RedisClientType>} Redis client
 */
export const getClient = async () => {
  if (client?.isOpen) {
    return client
  }

  if (isConnecting && connectionPromise) {
    return connectionPromise
  }

  isConnecting = true
  connectionPromise = connectRedis()

  try {
    await connectionPromise
    return client
  } finally {
    isConnecting = false
    connectionPromise = null
  }
}

/**
 * Disconnect from Redis
 * @returns {Promise<void>}
 */
export const disconnectRedis = async () => {
  if (client?.isOpen) {
    await client.quit()
    client = null
    logger.info('✅ Redis: disconnected!')
  }
}

registerShutdownTask(disconnectRedis, 'redis-disconnect')
