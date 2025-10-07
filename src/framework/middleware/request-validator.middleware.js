import { Joi } from '@/core/helpers/validator.helper'
import { ensureObject, pick } from '@/core/utils/common.util'
import { deepSanitize, isDangerousKey } from '@/core/utils/security.util'
import { isObject } from '@/core/utils/type-check.util'

/**
 * Filter object to only include keys defined in Joi schema
 * Recursively processes nested schemas and sanitizes to remove dangerous keys
 *
 * @param {Object} schema - Joi schema object or schema description
 * @param {*} value - Value to filter
 * @returns {*} Filtered value with only schema-defined keys
 */
const pickDefinedKeys = (schema, value) => {
  // Handle array schemas - deep sanitize array elements
  if (Array.isArray(value)) {
    return deepSanitize(value)
  }

  // Handle object schemas
  if (isObject(value)) {
    // Get schema description - handle both Joi objects and descriptions
    const schemaDescription =
      typeof schema.describe === 'function' ? schema.describe() : schema

    // Check if schema has keys (object schema)
    if (schemaDescription.keys) {
      // Handle array schemas
      if (Array.isArray(value)) {
        return value // For arrays, return the value as-is since Joi already validated it
      }

      // Handle object schemas
      if (typeof value === 'object' && value !== null) {
        const schemaDescription = schema.describe()

        // Check if schema has keys (object schema)
        if (schemaDescription.keys) {
          const schemaKeys = new Set(Object.keys(schemaDescription.keys))

          // Filter out only the allowed keys
          return Object.fromEntries(
            Object.entries(value).filter(([key]) => schemaKeys.has(key))
          )
        }
      }

      // For non-object, non-array values, return as-is
      return value
    }

    // If no keys defined in schema, still sanitize to remove dangerous keys
    return deepSanitize(value)
  }

  // For non-object, non-array values, return as-is
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
    throw new Error('Schema must be a valid object')
  }

  options = ensureObject(options, { removeUnknown: true })

  /* eslint-disable security/detect-object-injection */
  // Safe: Object access is controlled by hardcoded requestKeys and dangerous keys are filtered
  return (req, _res, next) => {
    const requestKeys = ['params', 'query', 'body']
    const raw = pick(req, requestKeys)
    const object = pick(raw, Object.keys(schema))

    const { value, error } = Joi.compile(schema)
      .prefs({ errors: { label: 'key' } })
      .validate(object)

    if (error) {
      return next(error)
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
    for (const key of requestKeys) {
      if (valueKeys.includes(key)) {
        continue
      }
      setRequestProperty(key, {})
    }

    if (!options.removeUnknown) {
      // Deep sanitize and assign all values
      for (const key of Object.keys(value)) {
        setRequestProperty(key, deepSanitize(value[key]))
      }
      return next()
    }

    // Filter unknown fields based on schema definitions
    const filteredValue = {}

    for (const key of requestKeys) {
      const keySchema = schema[key]

      if (keySchema && value[key] !== undefined) {
        filteredValue[key] = pickDefinedKeys(keySchema, value[key])
      } else {
        filteredValue[key] = {}
      }
    }

    // Safely assign filtered values
    for (const key of Object.keys(filteredValue)) {
      setRequestProperty(key, filteredValue[key])
    }
    return next()
  }
  /* eslint-enable security/detect-object-injection */
}
