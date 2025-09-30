/* eslint-disable security/detect-object-injection */
import { isObject } from './type-check.util'

export const pick = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) {
      acc[key] = obj[key]
    }
    return acc
  }, {})
}

export const omit = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) {
      acc[key] = obj[key]
    }
    return acc
  }, {})
}

/**
 * Ensures the provided value is a valid object; otherwise, returns the default value.
 * If the default value is not a valid object, it falls back to an empty object.
 *
 * @param {*} val - The value to check.
 * @param {Object} [defaultValue={}] - The default value to return if val is not a valid object.
 * @returns {Object} The valid object (either val or defaultValue).
 */
export const ensureObject = (val, defaultValue = {}) => {
  if (!isObject(defaultValue)) {
    defaultValue = {}
  }

  return isObject(val) ? val : defaultValue
}
