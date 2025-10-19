import { config } from 'dotenv-safe'
import path from 'path'

import { ENVIRONMENT } from '@/core/constants'
import { Joi, validate } from '@/core/helpers'

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

  // === Network ===
  API_ROOT: Joi.string().allow('').default('api'),

  // === Security ===
  JWT_SECRET: Joi.string().min(32).required(),

  // === Redis ===
  // REDIS_URI: Joi.string()
  //   .uri({ scheme: 'redis' })
  //   .default('redis://localhost:6379'),

  // === MongoDB Connections ===
  MONGODB_URI: Joi.string()
    .uri({ scheme: 'mongodb' })
    .default('mongodb://localhost/backend'),
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
