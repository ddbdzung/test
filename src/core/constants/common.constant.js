export const ENVIRONMENT = {
  DEVELOPMENT: 'development', // Local machine maybe
  PRODUCTION: 'production',
  TEST: 'test',
  STAGING: 'staging',
}

export const APP_NAME = {
  MAIN: 'main', // Main app
  QUEUE: 'queue', // Queue app
  SOCKET: 'socket', // Socket app
}

export const API_PREFIX = 'api'

/**
 * Standardized logging levels based on best practices.
 * Used to classify the severity and verbosity of log messages.
 */
export const LOG_LEVEL = {
  /**
   * DEBUG – developer-focused debugging
   * - Use for tracking state, parameters, internal flow
   * - Helpful in staging for bug investigation
   */
  DEBUG: 'debug',

  /**
   * INFO – general system information
   * - Use for “happy path” events
   *   (e.g., service started, user logged in, job completed)
   * - Usually always enabled in production for business insights
   */
  INFO: 'info',

  /**
   * WARN – warnings
   * - System still works but something needs attention
   *   (e.g., API retry threshold reached, slow response)
   * - Often triggers low-priority alerts
   */
  WARN: 'warn',

  /**
   * ERROR – recoverable errors
   * - A request or process failed, but the service is still running
   *   (e.g., DB query failed, API call timeout, validation error)
   * - Typically triggers medium-priority alerts
   */
  ERROR: 'error',

  /**
   * VERBOSE – detailed info for tracing complex flows
   * - Use for tracing complex flows (e.g., database query results)
   */
  VERBOSE: 'verbose',

  /**
   * HTTP – HTTP-specific events
   * - Use for HTTP-specific events (e.g., request logs, status codes, latency)
   */
  HTTP: 'http',
}

/**
 * Single source of truth for current environment
 */
export const CURRENT_ENV = process.env.NODE_ENV || ENVIRONMENT.DEVELOPMENT

/**
 * Timeout definitions in milliseconds
 */
export const TIMEOUT_CONTROLLER = {
  DEFAULT: 10_000,
  HEAVY_PROCESS: 20_000,
  ENQUEUE_PROCESS: 5_000,
}

export const REQUEST_ID_KEY = 'X-Request-Id'
