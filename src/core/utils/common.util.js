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
 * Validates and merges options with defaults.
 * Throws TypeError if options is invalid type (programming error).
 *
 * @param {Object|undefined|null} options - Options to merge (undefined/null allowed)
 * @param {Object} [defaults={}] - Default values
 * @returns {Object} Merged options
 * @throws {TypeError} When options is invalid type (array, string, number, etc)
 *
 * @example
 * // Valid - undefined/null will use defaults
 * mergeOptions(undefined, { timeout: 5000 }) // { timeout: 5000 }
 * mergeOptions(null, { timeout: 5000 })      // { timeout: 5000 }
 *
 * @example
 * // Valid - merge with defaults
 * mergeOptions({ timeout: 3000 }, { timeout: 5000, retry: 3 })
 * // { timeout: 3000, retry: 3 }
 *
 * @example
 * // Invalid - throws TypeError
 * mergeOptions("invalid", { timeout: 5000 })  // throws
 * mergeOptions([1, 2], { timeout: 5000 })     // throws
 */
export const mergeOptions = (options, defaults = {}) => {
  // Allow undefined/null (will use defaults only)
  if (options === undefined || options === null) {
    return { ...defaults }
  }

  // Reject invalid types - this is a programming error
  if (!isObject(options)) {
    throw new TypeError(`Options must be an object, got ${typeof options}`)
  }

  return {
    ...defaults,
    ...options,
  }
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
