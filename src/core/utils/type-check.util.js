/**
 * Type Checking Utilities
 * Core utilities for common type checking patterns
 *
 * For simple checks, use native methods inline:
 * - typeof value === 'string' instead of isString
 * - Array.isArray(value) instead of isArray
 * - value instanceof Date instead of isDate
 * - Number.isNaN(value) instead of isNanValue
 * etc.
 */

/**
 * Check if value is null or undefined
 * @param {*} value - The value to check
 * @returns {boolean}
 */
export const isNil = value => {
  return value === null || value === undefined
}

/**
 * Check if value is an object (excluding null and arrays)
 * @param {*} value - The value to check
 * @returns {boolean}
 */
export const isObject = value => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Check if value is a plain object (created by Object constructor or literal)
 * @param {*} value - The value to check
 * @returns {boolean}
 */
export const isPlainObject = value => {
  if (!isObject(value)) return false

  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - The value to check
 * @returns {boolean}
 */
export const isEmpty = value => {
  if (isNil(value)) return true
  if (typeof value === 'string' || Array.isArray(value))
    return value.length === 0
  if (isObject(value)) return Object.keys(value).length === 0
  return false
}

/**
 * Check if value is a primitive type
 * @param {*} value - The value to check
 * @returns {boolean}
 */
export const isPrimitive = value => {
  return (
    value === null ||
    typeof value === 'undefined' ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint'
  )
}
