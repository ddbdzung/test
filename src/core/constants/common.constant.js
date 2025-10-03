export const ENVIRONMENT = {
  DEVELOPMENT: 'development', // Local machine maybe
  PRODUCTION: 'production',
  TEST: 'test',
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
 *
 * Recommended usage by environment:
 * - Local/Dev: TRACE, DEBUG, INFO
 * - Staging:   INFO, WARN, ERROR
 * - Production: INFO, WARN, ERROR, FATAL
 */
export const LOG_LEVEL = {
  /**
   * TRACE – most detailed level
   * - Use for step-by-step debugging (loops, raw payloads, lifecycle)
   * - Usually enabled only locally for deep debugging
   * - Should NOT be enabled in production (too noisy)
   */
  TRACE: 'trace',

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
   * NOTICE – optional, between INFO and WARN
   * - Use for noteworthy but non-problem events
   *   (e.g., config reload, cache warmed up)
   * - Can be omitted if you prefer a simpler set
   */
  NOTICE: 'notice',

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
   * CRITICAL – severe errors, worse than ERROR but not system-wide failure
   * - A major part of the system is degraded
   *   (e.g., lost a DB shard, Kafka consumer down on one partition)
   * - Usually triggers high-priority alerts
   */
  CRITICAL: 'critical',

  /**
   * FATAL – system cannot continue
   * - Irrecoverable error, service must shut down
   *   (e.g., DB unreachable, corrupted configuration)
   * - Should trigger immediate alerts (PagerDuty, SMS, etc.)
   */
  FATAL: 'fatal',
}
