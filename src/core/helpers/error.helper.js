import { CURRENT_ENV, ENVIRONMENT } from '@/constants/common.constant'
import {
  HTTP_STATUS,
  getHttpStatusMessageCode,
} from '@/constants/http-status.constant'

import { mergeOptions } from '@/core/utils'

/**
 * @typedef {Object} BaseErrorOptions
 * @property {number} [statusCode] - HTTP status code (e.g., 400, 500). Default: 500
 * @property {string} [code] - Error code string (e.g., 'VALIDATION_ERROR'). Default: HTTP status message code
 * @property {boolean} [isOperational=true] - true: Operational error (expected), false: Programming error (bug)
 * @property {Object} [context] - Additional context data for debugging (e.g., { userId: 123, action: 'login' })
 * @property {Object} [metadata] - Additional metadata to merge with defaults (timestamp, environment)
 * @property {Error} [cause] - Original error that caused this error (for error chaining)
 */

/**
 * BaseError - Following Node.js Error Handling Best Practices.
 * Phân biệt rõ Operational Errors vs Programming Errors
 *
 * Operational Errors: Expected errors trong business flow (invalid input, network timeout,...).
 * Programming Errors: Bugs (null reference, type mismatch,...)
 *
 * @class
 * @extends Error
 * @implements {import('../Throwable').Throwable}
 * @example
 * // Basic usage
 * throw new BaseError('Something went wrong', {
 *   statusCode: 500,
 *   context: { userId: 123 }
 * });
 *
 * @example
 * // With error chaining
 * try {
 *   await database.query()
 * } catch (err) {
 *   throw new BaseError('Database query failed', {
 *     statusCode: 500,
 *     cause: err,
 *     context: { query: 'SELECT * FROM users' }
 *   });
 * }
 */
export class BaseError extends Error {
  /**
   * Creates a new BaseError instance
   * @param {string} message - Error message to display
   * @param {BaseErrorOptions} [options={}] - Error configuration options
   */
  constructor(message, options = {}) {
    super(message)

    // Error identity
    this.name = this.constructor.name
    this.message = message

    // HTTP context
    this.statusCode = options.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    this.code =
      options.code ||
      getHttpStatusMessageCode(this.statusCode).statusCodeMessage

    // Error classification
    this.isOperational = options.isOperational ?? true // true: Operational Errors, false: Programming Errors

    // Additional context
    this.context = options.context || {} // User-provided context
    this.metadata = {
      timestamp: new Date().toISOString(),
      environment: CURRENT_ENV,
      ...options.metadata,
    }

    // Error chaining support
    if (options.cause) {
      this.cause = options.cause
    }

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Get full error chain (this error + all causes)
   * @returns {Error[]} Array of errors from this error to root cause
   */
  getErrorChain() {
    const chain = [this]
    let current = this.cause

    while (current) {
      chain.push(current)
      current = current.cause
    }

    return chain
  }

  /**
   * Serialize to JSON object format (for logging/API response)
   * @returns {Object} Error object with all properties serialized
   * @returns {string} return.name - Error class name
   * @returns {string} return.code - Error code
   * @returns {string} return.message - Error message
   * @returns {number} return.statusCode - HTTP status code
   * @returns {boolean} return.isOperational - Whether error is operational
   * @returns {Object} return.context - Error context data
   * @returns {Object} return.metadata - Error metadata
   * @returns {string} [return.stack] - Stack trace (non-production only)
   * @returns {Object} [return.cause] - Serialized cause error (non-production only)
   */
  toJSON() {
    const base = {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      metadata: this.metadata,
    }

    // Include stack in non-production environments
    if (CURRENT_ENV !== ENVIRONMENT.PRODUCTION) {
      base.stack = this.stack
      if (this.cause) {
        base.cause =
          this.cause instanceof BaseError
            ? this.cause.toJSON()
            : { message: this.cause.message, stack: this.cause.stack }
      }
    }

    return base
  }
}

// ============= Specific Error Classes =============

/**
 * @typedef {Object} ValidationErrorDetail
 * @property {string} field - Field name that failed validation
 * @property {string} message - Validation error message
 * @property {*} [type] - Validation error type
 */

/**
 * ValidationError - For request validation failures (4xx)
 * @class
 * @extends BaseError
 * @example
 * throw new ValidationError('Validation failed', [
 *   { field: 'email', message: 'Invalid email format', type: 'string.email' },
 *   { field: 'age', message: 'Must be greater than 0', type: 'number.min' }
 * ]);
 */
export class ValidationError extends BaseError {
  /**
   * @param {string} message - Error message
   * @param {ValidationErrorDetail[]} [details=[]] - Array of validation error details
   */
  constructor(message, details = []) {
    super(message, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
      context: { errors: details },
      isOperational: true,
    })
  }
}

/**
 * NotFoundError - For resource not found errors (404)
 * @class
 * @extends BaseError
 * @example
 * throw new NotFoundError('User', 123);
 * // Error message: "User not found", context: { resource: 'User', identifier: 123 }
 */
export class NotFoundError extends BaseError {
  /**
   * @param {string} [resource='Resource'] - Name of the resource that was not found
   * @param {string|number|null} [identifier=null] - ID or identifier of the resource
   */
  constructor(resource = 'Resource', identifier = null) {
    super(`${resource} not found`, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      code: 'NOT_FOUND',
      context: { resource, identifier },
      isOperational: true,
    })
  }
}

/**
 * UnauthorizedError - For authentication failures (401)
 * @class
 * @extends BaseError
 */
export class UnauthorizedError extends BaseError {
  /**
   * @param {string} [message='Authentication required'] - Error message
   */
  constructor(message = 'Authentication required') {
    super(message, {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: 'UNAUTHORIZED',
      isOperational: true,
    })
  }
}

/**
 * ForbiddenError - For authorization failures (403)
 * @class
 * @extends BaseError
 */
export class ForbiddenError extends BaseError {
  /**
   * @param {string} [message='Access denied'] - Error message
   */
  constructor(message = 'Access denied') {
    super(message, {
      statusCode: HTTP_STATUS.FORBIDDEN,
      code: 'FORBIDDEN',
      isOperational: true,
    })
  }
}

/**
 * ConflictError - For resource conflicts (409)
 * @class
 * @extends BaseError
 */
export class ConflictError extends BaseError {
  /**
   * @param {string} message - Error message
   * @param {Object} [conflictDetails={}] - Details about the conflict
   */
  constructor(message, conflictDetails = {}) {
    super(message, {
      statusCode: HTTP_STATUS.CONFLICT,
      code: 'CONFLICT',
      context: conflictDetails,
      isOperational: true,
    })
  }
}

/**
 * TooManyRequestsError - For rate limiting (429)
 * @class
 * @extends BaseError
 */
export class TooManyRequestsError extends BaseError {
  /**
   * @param {string} message - Error message
   * @param {Object} [context={}] - Additional context (e.g., rate limit info)
   */
  constructor(message, context = {}) {
    super(message, {
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      code: 'TOO_MANY_REQUESTS',
      context,
      isOperational: true,
    })
  }
}

/**
 * InternalServerError - For internal server errors (500)
 * @class
 * @extends BaseError
 */
export class InternalServerError extends BaseError {
  /**
   * @param {string} [message='Internal server error'] - Error message
   * @param {Error|null} [cause=null] - Original error that caused this
   * @param {Object} [options={}] - Additional options
   * @param {Object} [options.context={}] - Additional context data for debugging
   */
  constructor(message = 'Internal server error', cause = null, options = {}) {
    super(
      message,
      mergeOptions(options, {
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_ERROR',
        cause,
        isOperational: false, // Usually a programming error
      })
    )
  }
}

/**
 * ServiceUnavailableError - For service unavailable errors (503)
 * @class
 * @extends BaseError
 */
export class ServiceUnavailableError extends BaseError {
  /**
   * @param {string} [service='Service'] - Name of the unavailable service
   * @param {Error|null} [cause=null] - Original error that caused this
   */
  constructor(service = 'Service', cause = null) {
    super(`${service} is currently unavailable`, {
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      code: 'SERVICE_UNAVAILABLE',
      context: { service },
      cause,
      isOperational: true, // External dependency issue
    })
  }
}

/**
 * BusinessError - For custom business logic errors
 * @class
 * @extends BaseError
 * @example
 * throw new BusinessError(
 *   'Insufficient balance',
 *   'INSUFFICIENT_BALANCE',
 *   { balance: 100, required: 500 }
 * );
 */
export class BusinessError extends BaseError {
  /**
   * @param {string} message - Error message
   * @param {string} errorCode - Custom business error code
   * @param {Object} [context={}] - Business context data
   */
  constructor(message, errorCode, context = {}) {
    super(message, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: errorCode,
      context,
      isOperational: true,
    })
  }
}
