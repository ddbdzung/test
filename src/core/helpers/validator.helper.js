// @ts-nocheck
import JoiDate from '@joi/date'
import Joi from 'joi'

// Extend Joi with date validation
/**
 * @type {import ('joi')}
 */
const ExtendedJoi = Joi.extend(JoiDate)

// Set default preferences
/**
 * @type {import ('joi')}
 */
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
