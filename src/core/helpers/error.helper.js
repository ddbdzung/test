import { ENVIRONMENT } from '../constants/common.constant'
import {
  HTTP_STATUS,
  HTTP_STATUS_MESSAGE,
  HTTP_STATUS_MESSAGE_CODE,
  getHttpStatusMessageCode,
} from '../constants/http-status.constant'

/**
 * BaseError - Following Node.js Error Handling Best Practices.
 * Phân biệt rõ Operational Errors vs Programming Errors
 *
 * Operational Errors: Expected errors trong business flow (invalid input, network timeout,...).
 * Programming Errors: Bugs (null reference, type mismatch,...)
 */
export class BaseError extends Error {
  /**
   * @param {string} message
   * @param {object} options
   */
  constructor(message, options = {}) {
    super(message)

    // Error identity
    this.name = this.constructor.name
    this.message = message

    // HTTP context
    if (options.statusCode) {
      const { statusCode, statusCodeMessage, message } =
        getHttpStatusMessageCode(options.statusCode)
      this.statusCode = statusCode
      this.code = statusCodeMessage
      this.message = message
    } else {
      this.statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR
      this.code = HTTP_STATUS_MESSAGE_CODE.INTERNAL_SERVER_ERROR
      this.message = HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR
    }

    // Error classification
    this.isOperational = options.isOperational ?? true // true: Operational Errors, false: Programming Errors

    // Additional context
    this.context = options.context || {} // User-provided context
    this.metadata = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
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
    if (process.env.NODE_ENV !== ENVIRONMENT.PRODUCTION) {
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
 * Client errors (4xx) - Operational
 */
export class ValidationError extends BaseError {
  /**
   * @param {string} message
   * @param {object[]} validationErrors
   */
  constructor(message, validationErrors = []) {
    super(message, {
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      code: 'VALIDATION_ERROR',
      context: { errors: validationErrors },
      isOperational: true,
    })
  }
}

export class NotFoundError extends BaseError {
  constructor(resource = 'Resource', identifier = null) {
    super(`${resource} not found`, {
      statusCode: HTTP_STATUS.NOT_FOUND,
      code: 'NOT_FOUND',
      context: { resource, identifier },
      isOperational: true,
    })
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message = 'Authentication required') {
    super(message, {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: 'UNAUTHORIZED',
      isOperational: true,
    })
  }
}

export class ForbiddenError extends BaseError {
  constructor(message = 'Access denied') {
    super(message, {
      statusCode: HTTP_STATUS.FORBIDDEN,
      code: 'FORBIDDEN',
      isOperational: true,
    })
  }
}

export class ConflictError extends BaseError {
  /**
   * @param {string} message
   * @param {object} conflictDetails
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

export class BadRequestError extends BaseError {
  /**
   * @param {string} message
   * @param {object} details
   */
  constructor(message, details = {}) {
    super(message, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: 'BAD_REQUEST',
      context: details,
      isOperational: true,
    })
  }
}

export class TooManyRequestsError extends BaseError {
  /**
   * @param {string} message
   * @param {object} context
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
 * Server errors (5xx)
 */
export class InternalServerError extends BaseError {
  constructor(message = 'Internal server error', cause = null) {
    super(message, {
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      cause,
      isOperational: false, // Usually a programming error
    })
  }
}

export class ServiceUnavailableError extends BaseError {
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
 * Business logic errors
 */
export class BusinessError extends BaseError {
  /**
   * @param {string} message
   * @param {string} errorCode
   * @param {object} context
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
