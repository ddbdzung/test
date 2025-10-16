import { REQUEST_ID_KEY } from '@/core/constants/common.constant'
import { BaseError, InternalServerError } from '@/core/helpers/error.helper'
import { requestContextHelper } from '@/core/helpers/request-context.helper'
import { ensureObject } from '@/core/utils/common.util'

/**
 * @typedef {Object} RequestContextOptions
 * @property {Function} [extractUserId] - Function to extract userId from req
 * @property {Function} [extractMetadata] - Function to extract additional metadata
 */

/**
 * Request context middleware - Setup AsyncLocalStorage context
 * @param {RequestContextOptions} options - Configuration options
 * @returns {Function} Express middleware
 * @example
 * app.use(requestContext({
 *   extractUserId: (req) => req.user?.id,
 *   extractMetadata: (req) => ({ tenantId: req.tenant?.id })
 * }));
 */
export const requestContext = options => {
  options = ensureObject(options, {
    extractUserId: null,
    extractMetadata: null,
  })

  const { extractUserId, extractMetadata } = options

  if (extractUserId && typeof extractUserId !== 'function') {
    throw new BaseError('extractUserId must be a function')
  }

  if (extractMetadata && typeof extractMetadata !== 'function') {
    throw new BaseError('extractMetadata must be a function')
  }

  return (req, res, next) => {
    try {
      // Generate or use existing requestId
      const requestId =
        // eslint-disable-next-line security/detect-object-injection
        req.headers[REQUEST_ID_KEY] || requestContextHelper.getRequestId()

      // Build initial context
      const context = {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        startTime: process.hrtime.bigint(),
        userId: extractUserId?.(req),
        ...extractMetadata?.(req),
      }

      // Attact requestId to request for ease access
      req.requestId = requestId

      // Set response header
      res.setHeader(REQUEST_ID_KEY, requestId)

      requestContextHelper.runWithContext(context, () => {
        next()
      })
    } catch (error) {
      next(new InternalServerError('Request context unknown error', error))
    }
  }
}
