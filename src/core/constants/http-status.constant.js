/* eslint-disable security/detect-object-injection */
export const HTTP_STATUS_MESSAGE = {
  // Success
  OK: 'OK',
  CREATED: 'Created',
  ACCEPTED: 'Accepted',
  NO_CONTENT: 'No Content',

  // Client errors
  BAD_REQUEST: 'Bad Request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not Found',
  CONFLICT: 'Conflict',
  UNPROCESSABLE_ENTITY: 'Unprocessable Entity',
  TOO_MANY_REQUESTS: 'Too Many Requests',
  REQUEST_TIMEOUT: 'Request Timeout',

  // Server errors
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
  SERVICE_UNAVAILABLE: 'Service Unavailable',
}

export const HTTP_STATUS = {
  OK: 200, // Most commonly used in API responses
  CREATED: 201, // Commonly used for creating a new resource
  ACCEPTED: 202, // For async operations (like sending email in background)
  NO_CONTENT: 204, // For empty response (like delete resource)

  BAD_REQUEST: 400, // Catch invalid request input like invalid json format, missing required headers
  UNAUTHORIZED: 401, // Catch Authenticate errors
  FORBIDDEN: 403, // Catch Authorization errors
  NOT_FOUND: 404, // Catch not found of any resource getting failed
  CONFLICT: 409, // Catch conflict of business logic (existing email,...)
  UNPROCESSABLE_ENTITY: 422, // Catch unprocessable entity errors (invalid data input - not meet the business logic)
  TOO_MANY_REQUESTS: 429, // Rate limit exceeded
  REQUEST_TIMEOUT: 408, // Request timeout

  INTERNAL_SERVER_ERROR: 500, // Catch unexpected errors
  SERVICE_UNAVAILABLE: 503, // Catch service unavailable errors
}

export const HTTP_STATUS_MESSAGE_CODE = {
  OK: 'OK',
  CREATED: 'CREATED',
  ACCEPTED: 'ACCEPTED',
  NO_CONTENT: 'NO_CONTENT',

  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',

  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
}

export const HTTP_STATUS_MESSAGE_CODE_MAP = {
  [HTTP_STATUS.OK]: HTTP_STATUS_MESSAGE_CODE.OK,
  [HTTP_STATUS.CREATED]: HTTP_STATUS_MESSAGE_CODE.CREATED,
  [HTTP_STATUS.ACCEPTED]: HTTP_STATUS_MESSAGE_CODE.ACCEPTED,
  [HTTP_STATUS.NO_CONTENT]: HTTP_STATUS_MESSAGE_CODE.NO_CONTENT,

  [HTTP_STATUS.BAD_REQUEST]: HTTP_STATUS_MESSAGE_CODE.BAD_REQUEST,
  [HTTP_STATUS.UNAUTHORIZED]: HTTP_STATUS_MESSAGE_CODE.UNAUTHORIZED,
  [HTTP_STATUS.FORBIDDEN]: HTTP_STATUS_MESSAGE_CODE.FORBIDDEN,
  [HTTP_STATUS.NOT_FOUND]: HTTP_STATUS_MESSAGE_CODE.NOT_FOUND,
  [HTTP_STATUS.CONFLICT]: HTTP_STATUS_MESSAGE_CODE.CONFLICT,
  [HTTP_STATUS.UNPROCESSABLE_ENTITY]:
    HTTP_STATUS_MESSAGE_CODE.UNPROCESSABLE_ENTITY,
  [HTTP_STATUS.TOO_MANY_REQUESTS]: HTTP_STATUS_MESSAGE_CODE.TOO_MANY_REQUESTS,
  [HTTP_STATUS.REQUEST_TIMEOUT]: HTTP_STATUS_MESSAGE_CODE.REQUEST_TIMEOUT,

  [HTTP_STATUS.INTERNAL_SERVER_ERROR]:
    HTTP_STATUS_MESSAGE_CODE.INTERNAL_SERVER_ERROR,
  [HTTP_STATUS.SERVICE_UNAVAILABLE]:
    HTTP_STATUS_MESSAGE_CODE.SERVICE_UNAVAILABLE,
}

/**
 * @param {number | string} statusCode
 * @returns {{
 *  statusCode: number
 *  statusCodeMessage: string
 *  message: string
 * }}
 */
export const getHttpStatusMessageCode = statusCode => {
  if (!statusCode || !Object.values(HTTP_STATUS).includes(Number(statusCode))) {
    throw new Error(
      'Status code not found or not supported, received: ' + statusCode
    )
  }

  return {
    statusCode: Number(statusCode),
    statusCodeMessage: HTTP_STATUS_MESSAGE_CODE_MAP[statusCode],
    message: HTTP_STATUS_MESSAGE[statusCode],
  }
}
