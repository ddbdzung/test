import { AsyncLocalStorage } from 'async_hooks'
import crypto from 'crypto'

import { BaseError } from '@/core/helpers/error.helper'
import { isDangerousKey } from '@/core/utils/security.util'

class RequestContextHelper {
  #asyncLocalStorage = null
  constructor() {
    this.#asyncLocalStorage = new AsyncLocalStorage()
  }

  /**
   * Initialize request context
   * @param {Object} initialContext - Initial context data
   * @param {Function} callback - Function to run with context
   */
  runWithContext(initialContext, callback) {
    return this.#asyncLocalStorage.run(initialContext, callback)
  }

  /**
   * Get current request context
   * @returns {Object|undefined} Current context or undefined
   */
  getContext() {
    return this.#asyncLocalStorage.getStore()
  }

  /**
   * Get specific value from context
   * @param {string} key - Context key
   * @param {Object} cachedContext - Cached context
   * @returns {null|*} Value or undefined
   * @throws {BaseError} If key is not allowed or no context found
   */
  getContextValue(key, cachedContext = null) {
    const context = cachedContext || this.getContext()
    if (isDangerousKey(key)) throw new BaseError(`Key is not allowed: ${key}`)

    return context?.[key] ?? null
  }

  /**
   * Set value in current context
   * @param {string} key - Context key
   * @param {*} value - Value to set
   * @returns {Object} Context
   * @throws {BaseError} If key is not allowed or no context found
   */
  setContextValue(key, value) {
    const context = this.getContext()
    if (isDangerousKey(key)) throw new BaseError(`Key is not allowed: ${key}`)

    context[key] = value
    return context
  }

  /**
   * Get or generate requestId
   */
  getRequestId() {
    return this.getContextValue('requestId') || this.#generateRequestId()
  }

  /**
   * Generate unique request ID
   */
  #generateRequestId() {
    return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
  }
}

export const requestContextHelper = new RequestContextHelper()
