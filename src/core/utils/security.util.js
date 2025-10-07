import { isObject } from './type-check.util'

/**
 * Dangerous keys that can cause prototype pollution
 */
export const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Safe check if key is dangerous
 * @param {string} key - Key to check
 * @returns {boolean}
 */
export const isDangerousKey = key => DANGEROUS_KEYS.has(key)

/**
 * Recursively sanitize object/array by removing dangerous keys at all levels
 * Handles circular references to prevent infinite loops
 *
 * @param {*} value - Value to sanitize
 * @param {WeakSet} [visited=new WeakSet()] - Track visited objects for circular reference detection
 * @returns {*} Sanitized value
 *
 * @example
 * const malicious = {
 *   user: 'john',
 *   nested: {
 *     __proto__: { isAdmin: true }
 *   }
 * }
 * const safe = deepSanitize(malicious)
 * // Returns: { user: 'john', nested: {} }
 */
export const deepSanitize = (value, visited = new WeakSet()) => {
  // Handle primitives and null
  if (value === null || typeof value !== 'object') {
    return value
  }

  // Handle circular references
  if (visited.has(value)) {
    return undefined // Skip circular references
  }
  visited.add(value)

  // Handle arrays - recursively sanitize each element
  if (Array.isArray(value)) {
    return value
      .map(item => deepSanitize(item, visited))
      .filter(item => item !== undefined)
  }

  // Handle built-in objects (Date, RegExp, etc.) - return as-is
  // Must check before isObject because they are also objects
  if (
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof Error
  ) {
    return value
  }

  // Handle plain objects - recursively sanitize and filter dangerous keys
  if (isObject(value)) {
    const sanitized = {}
    /* eslint-disable security/detect-object-injection */
    for (const [key, val] of Object.entries(value)) {
      if (!isDangerousKey(key)) {
        const cleanValue = deepSanitize(val, visited)
        if (cleanValue !== undefined) {
          sanitized[key] = cleanValue
        }
      }
    }
    /* eslint-enable security/detect-object-injection */
    return sanitized
  }

  // For other unknown object types, return as-is
  return value
}
