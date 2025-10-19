import path from 'path'

import { logger } from '@/core/helpers'
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

    // Ports
    port: env.PORT,

    apiRoot: env.API_ROOT,

    // Security
    jwtSecret: env.JWT_SECRET,

    // Redis
    redis: {
      uri: env.REDIS_URI,
    },

    // MongoDB Connections
    mongo: {
      connections: {
        main: {
          uri: env.MONGODB_URI,
          options: {},
        },
      },
    },
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

logger.info('Application configuration loaded', {
  environment: config.env,
  port: config.port,
})

export default config
