import path from 'path'
import util from 'util'

import { CURRENT_ENV, ENVIRONMENT } from '@/core/constants'
import { merge } from '@/core/utils'

// Import validated environment variables
import env from './env-schema'

/**
 * Application Configuration
 * Combines validated env vars with environment-specific settings
 *
 * Philosophy:
 * - env.config.js: Validation-first (Joi schema, fail-fast)
 * - app.config.js: Structure & merge (environment-based, organized)
 */

/**
 * Configuration structure organized by environment
 */
const rawConfig = {
  // === Shared configuration across all environments ===
  all: {
    env: env.NODE_ENV,
    root: path.join(__dirname, '..'),
    service: env.SERVICE, // Service name
    apiEndpoint: env.API_ENDPOINT,
    // Ports
    port: env.PORT,

    apiRoot: env.API_ROOT,

    // Redis
    redis: {
      uri: env.REDIS_URI,
      defaultTTL: env.REDIS_DEFAULT_TTL,
      cachePrefix: env.CACHE_PREFIX,
    },

    // MongoDB Connections
    mongo: {
      connections: {
        main: {
          uri: env.MONGODB_URI,
          options: {
            autoIndex: CURRENT_ENV !== ENVIRONMENT.PRODUCTION,
            autoCreate: true,
          },
        },
      },
    },
  },

  kafka: {
    clientId: env.KAFKA_CLIENTID,
    brokers: [env.KAFKA_BROKER],
    mechanism: env.KAFKA_MECHANISM,
    username: env.KAFKA_USERNAME,
    password: env.KAFKA_PASSWORD,
  },

  // === Test environment ===
  test: {
    // Test-specific overrides
  },

  // === Development environment ===
  development: {
    // Dev-specific overrides
  },

  // === Beta/Staging environment ===
  beta: {
    mongo: {
      uri: env.MONGODB_URI,
    },
  },

  // === Production environment ===
  production: {
    ip: env.IP || undefined,
    port: env.PORT || 8080,
    mongo: {
      uri: env.MONGODB_URI,
    },
  },
}

// Merge base config with environment-specific config
const config = merge(rawConfig.all, rawConfig[rawConfig.all.env])

if (CURRENT_ENV === ENVIRONMENT.DEVELOPMENT) {
  console.log(
    'Application configuration loaded',
    util.inspect(config, { depth: null, colors: true })
  )
} else {
  console.log('Application configuration loaded', {
    environment: config.env,
  })
}

export default config
