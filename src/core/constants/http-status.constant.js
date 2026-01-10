export const HTTP_STATUS = {
  OK: { code: 200, message: 'OK' },
  CREATED: { code: 201, message: 'Created' },
  ACCEPTED: { code: 202, message: 'Accepted' },
  NO_CONTENT: { code: 204, message: 'No Content' },

  BAD_REQUEST: { code: 400, message: 'Bad Request' },
  UNAUTHORIZED: { code: 401, message: 'Unauthorized' },
  FORBIDDEN: { code: 403, message: 'Forbidden' },
  NOT_FOUND: { code: 404, message: 'Not Found' },
  CONFLICT: { code: 409, message: 'Conflict' },
  UNPROCESSABLE_ENTITY: { code: 422, message: 'Unprocessable Entity' },
  TOO_MANY_REQUESTS: { code: 429, message: 'Too Many Requests' },
  REQUEST_TIMEOUT: { code: 408, message: 'Request Timeout' },

  INTERNAL_SERVER_ERROR: { code: 500, message: 'Internal Server Error' },
  SERVICE_UNAVAILABLE: { code: 503, message: 'Service Unavailable' },
}
Object.freeze(HTTP_STATUS)

/**
 * Find an HTTP status by code.
 *
 * @param {number} code - HTTP status code
 * @returns {{ key: string } & HttpStatusItem}
 * @throws {Error} If the status code is not defined
 */
export const getHttpStatus = code => {
  const entry = Object.entries(HTTP_STATUS).find(([_, v]) => v.code === code)

  if (!entry) {
    throw new Error(`Status code not found: ${code}`)
  }

  return { key: entry[0], ...entry[1] }
}

// Usage Examples:
// HTTP_STATUS.OK.code // 200
// HTTP_STATUS.OK.message // "OK"
// getHttpStatus(200) // { key: "OK", code: 200, message: "OK" }
