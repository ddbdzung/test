/* eslint-disable security/detect-object-injection */
import { isDangerousKey } from './security.util'
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
      // Skip dangerous keys to prevent prototype pollution at all levels
      if (isDangerousKey(key)) continue

      const sourceValue = source[key]
      const targetValue = target[key]

      if (isObject(sourceValue) && isObject(targetValue)) {
        // Recursively merge - dangerous keys will be filtered at each level
        target[key] = merge({}, targetValue, sourceValue)
      } else {
        target[key] = sourceValue
      }
    }
  }
  return target
}

/**
 * Sleeps for a given number of milliseconds
 * @param {number} ms - The number of milliseconds to sleep
 * @returns {Promise<void>} A promise that resolves after the given number of milliseconds
 */
export const snooze = ms => new Promise(resolve => setTimeout(resolve, ms))
