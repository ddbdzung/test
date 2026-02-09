/*
 * Author: Dzung Dang
 */
import qs from 'qs'

import {
  InternalServerError,
  Joi,
  ValidationError,
  logger,
  requestContextHelper,
} from '@/core/helpers'
import {
  deepSanitize,
  isDangerousKey,
  isEmpty,
  isObject,
  mergeOptions,
} from '@/core/utils'

function queryParser(url, options) {
  if (typeof url !== 'string') {
    throw new TypeError('URL must be a string')
  }

  try {
    const queryStringIdx = url.indexOf('?')
    const queryString =
      queryStringIdx === -1 ? '' : url.substring(queryStringIdx + 1)
    return qs.parse(queryString, { ...options })
  } catch (error) {
    throw new InternalServerError('Failed to parse query string', error, {
      context: { error, isOperational: true },
    })
  }
}

/**
 * Filter object to only include keys defined in Joi schema
 * Recursively processes nested schemas and sanitizes to remove dangerous keys
 *
 * @param {Object} schema - Joi schema object or schema description
 * @param {*} value - Value to filter
 * @returns {*} Filtered value with only schema-defined keys
 */
const pickDefinedKeys = (schema, value) => {
  if (Array.isArray(value)) {
    return deepSanitize(value)
  }

  if (isObject(value)) {
    const schemaDescription =
      typeof schema.describe === 'function' ? schema.describe() : schema

    if (schemaDescription.keys) {
      const schemaKeys = Object.keys(schemaDescription.keys)
      const result = {}

      for (const key of schemaKeys) {
        if (key in value && !isDangerousKey(key)) {
          const nestedSchema = schemaDescription.keys[key]
          const nestedValue = value[key]

          if (nestedSchema && nestedValue !== undefined) {
            result[key] = pickDefinedKeys(nestedSchema, nestedValue)
          } else {
            result[key] = deepSanitize(nestedValue)
          }
        }
      }

      return result
    }

    return deepSanitize(value)
  }

  return value
}

/**
 * Middleware for validating request parameters using Joi.
 *
 * IMPORTANT: Schema must allow unknown fields (.unknown(true)) for proper filtering.
 *
 * Flow:
 * 1. Extract params/query/body from request
 * 2. Validate against Joi schema
 * 3. Filter unknown fields if removeUnknown=true
 * 4. Assign validated data back to req object
 *
 * @param {Object} schema - Joi schema with keys: params, query, body
 * @param {Object} [options={ removeUnknown: true }] - Configuration options
 * @param {boolean} [options.removeUnknown=true] - Remove fields not in schema definition
 * @returns {Function} Express middleware function
 *
 * @example
 * const schema = {
 *   params: Joi.object({ id: Joi.string() }).unknown(true),
 *   query: Joi.object({ limit: Joi.number() }).unknown(true)
 * };
 * app.get('/users/:id', requestValidator(schema), handler);
 */
export const requestValidator = (schema, options) => {
  // Input validation
  if (!isObject(schema)) {
    throw new TypeError('Schema must be a valid object')
  }

  if (schema.query && !Joi.isSchema(schema.query)) {
    throw new TypeError('Query schema must be a valid Joi schema')
  }

  if (schema.body && !Joi.isSchema(schema.body)) {
    throw new TypeError('Body schema must be a valid Joi schema')
  }

  if (schema.params && !Joi.isSchema(schema.params)) {
    throw new TypeError('Params schema must be a valid Joi schema')
  }

  const { removeUnknown, parseQueryOptions } = mergeOptions(options, {
    removeUnknown: true,
    parseQueryOptions: {
      allowPrototypes: false,
      arrayLimit: Infinity,
      depth: 20,
      parameterLimit: 1000,
      strictNullHandling: false,
      plainObjects: false,
    },
  })

  // Safe: Object access is controlled by hardcoded requestKeys and dangerous keys are filtered
  return (req, _res, next) => {
    try {
      const object = {
        params: req.params || {},
        body: req.body || {},
        query: queryParser(req.url, parseQueryOptions) || {},
      }

      const { value, error } = Joi.compile(schema)
        .prefs({ errors: { label: 'key' } })
        .validate(object)

      if (error) {
        const details = error.details.map(d => ({
          field: d.path.join('.'),
          type: d.type,
          message: d.message,
        }))

        next(new ValidationError('Request validation failed', details))
        return
      }

      if (isEmpty(requestContextHelper.getContext())) {
        // TODO: Test case below: request context store has not initialized yet
        const error = new InternalServerError(
          'Request context is not found',
          undefined,
          { context: { requestContextHelper, isOperational: true } }
        )
        logger.error('Request context is not found')
        next(error)
        return
      }

      const setRequestPropertyToALS = (key, val) => {
        requestContextHelper.setContextValue(`apiRequest_${key}`, val)
      }
      // Helper function to safely set request properties (Express 5 compatible)
      const setRequestProperty = (key, val) => {
        if (isDangerousKey(key)) return

        try {
          // Try direct assignment first (Express 4)
          req[key] = val
        } catch {
          // Express 5: Use Object.defineProperty to override read-only getters
          Object.defineProperty(req, key, {
            value: val,
            writable: true,
            enumerable: true,
            configurable: true,
          })
        }
      }

      // Ensure base request properties exist
      const valueKeys = Object.keys(value)
      for (const key of ['query', 'params', 'body']) {
        if (valueKeys.includes(key)) continue

        setRequestPropertyToALS(key, {})
      }

      if (!removeUnknown) {
        setRequestPropertyToALS('query', deepSanitize(value.query))
        for (const key of Object.keys(value)) {
          setRequestProperty(key, deepSanitize(value[key]))
        }
        next()
        return
      }

      const filteredValue = {}
      for (const key of ['query', 'params', 'body']) {
        const keySchema = schema[key]
        if (keySchema && value[key] !== undefined) {
          filteredValue[key] = pickDefinedKeys(keySchema, value[key])
        } else {
          filteredValue[key] = {}
        }
      }
      setRequestPropertyToALS('query', filteredValue.query)
      for (const key of Object.keys(filteredValue)) {
        setRequestProperty(key, filteredValue[key])
      }

      next()
    } catch (error) {
      next(new InternalServerError('Request validator unknown error', error))
    }
  }
}
