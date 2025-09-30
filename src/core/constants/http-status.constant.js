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

  // Server errors
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
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

  INTERNAL_SERVER_ERROR: 500, // Catch unexpected errors
}
