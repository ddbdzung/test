import logger from '@/helpers/logger.helper'
import path from 'path'

import { merge } from '@/utils/common.util'

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

// MongoDB default options
// const defaultMongoOptions = {
//   useUnifiedTopology: true,
//   useNewUrlParser: true,
//   useCreateIndex: true,
//   keepAlive: true, // Giúp giữ kết nối luôn sống
//   keepAliveInitialDelay: 300000, // 5 minutes - Hữu ích nếu MongoDB có idle timeout
//   socketTimeoutMS: 0, // Tắt timeout do không có hoạt động
// }

// Log validated port for debugging
// logger.debug('Validated PORT:', env.PORT)

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
