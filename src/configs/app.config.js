import path from 'path'

import { merge } from '@/core/utils/common.util'

// import logger from '@/services/logger'

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
const config = {
  // === Shared configuration across all environments ===
  all: {
    env: env.NODE_ENV,
    root: path.join(__dirname, '..'),

    // Ports
    port: env.PORT,
    portQueue: env.PORT_QUEUE,
    portSocket: env.PORT_SOCKET,

    // Network
    ip: env.IP,
    apiRoot: env.API_ROOT,

    // Service
    service: env.SERVICE,
    serviceToken: env.SERVICE_TOKEN,
    masterKey: env.MASTER_KEY,
    apiEndpoint: env.API_ENDPOINT,

    // Security
    jwtSecret: env.JWT_SECRET,

    // Redis
    redis: {
      uri: env.REDIS_URI,
      adapterUri: env.REDIS_ADAPTER_URI,
    },

    // MongoDB Connections
    mongo: {
      connections: {
        dashboard: {
          uri: env.MONGODB_URI,
          options: {},
        },
      },
    },

    // Elasticsearch Connections
    elasticsearch: {
      connections: {
        dashboard: {
          node: env.ELASTICSEARCH_URI,
          isDefault: true,
        },
        loyalty: {
          node: env.ELASTICSEARCH_LOYALTY_URI,
        },
      },
    },

    // Kafka Configuration
    kafka: {
      clientId: env.KAFKA_CLIENTID,
      brokers: [env.KAFKA_BROKER],
      mechanism: env.KAFKA_MECHANISM,
      username: env.KAFKA_USERNAME,
      password: env.KAFKA_PASSWORD,
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
const mergedConfig = merge(config.all, config[config.all.env])

// logger.info('Application configuration loaded', {
//   environment: mergedConfig.env,
//   port: mergedConfig.port,
//   service: mergedConfig.service,
// })

export default mergedConfig
