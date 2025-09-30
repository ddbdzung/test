/* eslint-disable security/detect-object-injection */
// @ts-nocheck
import JoiDate from '@joi/date'
import Joi from 'joi'

import { ensureObject, pick } from '@/core/utils/common.util'
import { isArray, isObject } from '@/core/utils/type-check.util'

// Extend Joi with date validation
const ExtendedJoi = Joi.extend(JoiDate)

// Set default preferences
const ConfiguredJoi = ExtendedJoi.defaults(schema =>
  schema.prefs({
    abortEarly: true,
    errors: {
      label: 'key',
    },
  })
)

export { ConfiguredJoi as Joi }

/**
 * Filter object to only include keys defined in Joi schema
 *
 * @param {Object} schema - Joi schema object
 * @param {*} value - Value to filter
 * @returns {*} Filtered value with only schema-defined keys
 */
const pickDefinedKeys = (schema, value) => {
  // Handle array schemas - return as-is since Joi validates structure
  if (isArray(value)) {
    return value
  }

  // Handle object schemas
  if (isObject(value)) {
    const schemaDescription = schema.describe()

    // Check if schema has keys (object schema)
    if (schemaDescription.keys) {
      const schemaKeys = new Set(Object.keys(schemaDescription.keys))

      return Object.fromEntries(
        Object.entries(value).filter(([key]) => schemaKeys.has(key))
      )
    }
  }

  // For non-object, non-array values, return as-is
  return value
}

/**
 * Validate data against Joi schema
 *
 * @param {Object} schema - Joi schema object
 * @param {*} raw - Raw data to validate
 * @returns {*} Validated and transformed data
 * @throws {Error} Joi validation error if validation fails
 */
export const validate = (schema, raw) => {
  if (!schema) {
    throw new Error('Schema is required')
  }

  const { value, error } = Joi.compile(schema).validate(raw)

  if (error) throw error
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

    // Ensure base request properties exist
    const valueKeys = Object.keys(value)
    for (const key of requestKeys) {
      if (valueKeys.includes(key)) {
        continue
      }
      req[key] = {}
    }

    if (!options.removeUnknown) {
      Object.assign(req, value)
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

    Object.assign(req, filteredValue)
    return next()
  }
}
