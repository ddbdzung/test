import { config } from 'dotenv-safe'
import path from 'path'

import { ENVIRONMENT, LOG_LEVEL } from '@/core/constants/common.constant'
import { Joi, validate } from '@/core/helpers/validator.helper'

config({
  path: path.join(process.cwd(), '.env'),
  example: path.join(process.cwd(), '.env.example'),
})

/**
 * Environment variables validation schema
 * Ensures all required env vars are present with correct types
 * Follows validation-first philosophy with Joi
 */

const envSchema = Joi.object({
  // === Core Configuration ===
  NODE_ENV: Joi.string()
    .valid(...Object.values(ENVIRONMENT))
    .default(ENVIRONMENT.DEVELOPMENT),

  // === Ports ===
  PORT: Joi.number().default(8000), // Main App Port
  PORT_QUEUE: Joi.number().default(8001), // Queue App Port
  PORT_SOCKET: Joi.number().default(8002), // Socket App Port

  // === Network ===
  IP: Joi.string().ip().default('0.0.0.0'),
  API_ROOT: Joi.string().allow('').default(''),

  // === Service Configuration ===
  SERVICE: Joi.string().required(), //
  SERVICE_TOKEN: Joi.string().required(),
  MASTER_KEY: Joi.string().required(),
  API_ENDPOINT: Joi.string().uri().required(),

  // === Security ===
  JWT_SECRET: Joi.string().min(32).required(),

  // === Redis ===
  REDIS_URI: Joi.string()
    .uri({ scheme: 'redis' })
    .default('redis://localhost:6379'),

  // === MongoDB Connections ===
  MONGODB_URI: Joi.string()
    .uri({ scheme: 'mongodb' })
    .default('mongodb://localhost/backend'),

  // === Elasticsearch Connections ===
  ELASTICSEARCH_URI: Joi.string()
    .uri()
    .default('http://localhost/elasticsearch/'),

  // === Kafka Configuration ===
  // KAFKA_CLIENTID: Joi.string().required(),
  // KAFKA_BROKER: Joi.string().required(), // e.g., 'kafka1:9092,kafka2:9092'
  // KAFKA_MECHANISM: Joi.string()
  //   .valid('plain', 'scram-sha-256', 'scram-sha-512')
  //   .default('plain'),
  // KAFKA_USERNAME: Joi.string().required(),
  // KAFKA_PASSWORD: Joi.string().required(),

  // === Logging ===
  LOG_LEVEL: Joi.string()
    .valid(...Object.values(LOG_LEVEL))
    .default(LOG_LEVEL.INFO),
})
  .unknown(true) // Allow other env vars but don't validate them
  .prefs({
    abortEarly: false,
    stripUnknown: false, // Keep unknown env vars in process.env
  })

/**
 * Validate and parse environment variables
 * Throws error if validation fails (fail-fast approach)
 */
let parsedEnv = {}
try {
  parsedEnv = validate(envSchema, process.env)
} catch (error) {
  console.error(
    '[env-schema] Error validating environment variables:',
    error?.message
  )
  process.exit(1)
}

export default parsedEnv
