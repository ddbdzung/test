import {
  HTTP_STATUS,
  HTTP_STATUS_MESSAGE_CODE,
  HTTP_STATUS_MESSAGE_CODE_MAP,
} from '@/core/constants'
import { BaseError, HttpResponse } from '@/core/helpers'

export const buildStatusText = statusCode => {
  if (statusCode === HTTP_STATUS.BAD_REQUEST) return 'BAD_USER_INPUT'
  return statusCode >= 200 && statusCode < 300 ? 'SUCCESS' : 'ERROR'
}

export class SmaxResponse extends HttpResponse {
  constructor(statusCode, data, message, metadata = {}) {
    super(statusCode, data, message, metadata)
  }

  getStatusCode() {
    return this.statusCode
  }

  toJSON() {
    return {
      status: this.statusCode,
      statusText: buildStatusText(this.statusCode),
      message: this.message || HTTP_STATUS_MESSAGE_CODE_MAP[this.statusCode],
      data: this.data,
      timestamp: this.timestamp,
      ...this.metadata,
    }
  }
}

/**
 * @typedef {import('@/core/helpers').BaseErrorOptions} BackdoorErrorOptions
 */
export class BackdoorError extends BaseError {
  /**
   * @param {string} message - Error message
   * @param {BackdoorErrorOptions} [options={}] - Error configuration options
   */
  constructor(message, options = {}) {
    super(message, options)
  }

  getStatusCode() {
    return this.statusCode
  }

  isBadRequest() {
    this.statusCode = HTTP_STATUS.BAD_REQUEST
    this.code = HTTP_STATUS_MESSAGE_CODE.BAD_REQUEST
    this.message = this.message || 'Bad User Input'
    return this
  }

  toJSON() {
    return new SmaxResponse(
      this.statusCode,
      null,
      this.message,
      this.metadata
    ).toJSON()
  }
}
