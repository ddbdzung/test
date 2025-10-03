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

export const merge = (target, ...sources) => {
  for (const source of sources) {
    if (!isObject(source)) continue

    for (const key of Object.keys(source)) {
      const sourceValue = source[key]
      const targetValue = target[key]

      if (isObject(sourceValue) && isObject(targetValue)) {
        target[key] = merge({}, targetValue, sourceValue)
      } else {
        target[key] = sourceValue
      }
    }
  }
  return target
}
