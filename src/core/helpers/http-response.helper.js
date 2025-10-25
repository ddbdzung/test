import {
  HTTP_STATUS,
  HTTP_STATUS_MESSAGE_CODE_MAP,
} from '@/constants/http-status.constant'

/**
 * Class to build standardized HTTP response
 * @implements {import('../Throwable').Throwable}
 */
export class HttpResponse {
  /**
   * @param {number} [statusCode] - HTTP status code
   * @param {any} [data] - Data to send in the response
   * @param {string} [message] - Message to send in the response
   * @param {any} [metadata] - Metadata to send in the response
   */
  constructor(statusCode, data, message, metadata = {}) {
    this.statusCode = statusCode || HTTP_STATUS.OK
    this.success = statusCode >= 200 && statusCode < 300
    this.data = data
    this.message = message || HTTP_STATUS_MESSAGE_CODE_MAP[this.statusCode]
    this.metadata = metadata
    this.timestamp = new Date().toISOString()
  }

  /**
   * Helper method to convert the response to JSON object format
   */
  toJSON() {
    return {
      success: this.success,
      statusCode: this.statusCode,
      data: this.data,
      message: this.message,
      meta: this.metadata,
      timestamp: this.timestamp,
    }
  }
}
