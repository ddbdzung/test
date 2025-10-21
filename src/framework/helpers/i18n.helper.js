import i18next from 'i18next'
import Backend from 'i18next-fs-backend'
import middleware from 'i18next-http-middleware'
import path from 'path'

import { CURRENT_ENV, ENVIRONMENT } from '@/core/constants'

/**
 * @typedef {import('i18next').InitOptions} I18nInitOptions
 */

/**
 * Global i18next instance
 * @type {import('i18next').i18n}
 */
let i18nInstance = null

/**
 * Khởi tạo i18n instance với cấu hình
 *
 * @param {Partial<I18nInitOptions> & {
 *   localesPath?: string
 * }} [options] - Cấu hình i18n
 * @returns {import('i18next').i18n} i18n instance đã khởi tạo
 */
export function initI18n(options = {}) {
  const {
    fallbackLng = 'en',
    preload = ['en', 'vi'],
    ns = ['common'],
    defaultNS = 'common',
    debug = CURRENT_ENV !== ENVIRONMENT.PRODUCTION,
    localesPath = path.join(
      process.cwd(),
      'src',
      'locales',
      '{{lng}}/{{ns}}.json'
    ),
  } = options

  i18nInstance = i18next.createInstance()

  i18nInstance
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
      fallbackLng,
      preload,
      ns,
      defaultNS,
      debug,
      backend: {
        loadPath: localesPath,
      },
      detection: {
        order: ['header', 'querystring', 'cookie'],
        lookupHeader: 'accept-language',
        lookupQuerystring: 'lang',
        caches: false,
      },
      ...options,
    })

  return i18nInstance
}

/**
 * Lấy i18n instance hiện tại
 *
 * @returns {import('i18next').i18n | null}
 */
export function getI18nInstance() {
  return i18nInstance
}

/**
 * Translation function để dùng ngoài request context
 *
 * @param {string} key - Translation key
 * @param {object} [options] - Options (lng, defaultValue, interpolation params, etc.)
 * @returns {string} Translated string
 *
 * @example
 * import { t } from '@/framework/helpers/i18n.helper.js';
 *
 * const message = t ('welcome', { lng: 'vi' });
 * const greeting = t ('greeting', { name: 'John', lng: 'en' });
 */
export function t(key, options = {}) {
  if (!i18nInstance) {
    console.warn('i18n not initialized. Call initI18n() first.')
    return key
  }
  return i18nInstance.t(key, options)
}

/**
 * Kiểm tra xem key có tồn tại trong translations không
 *
 * @param {string} key - Translation key
 * @param {object} [options] - Options (lng, ns, etc.)
 * @returns {boolean}
 */
export function exists(key, options = {}) {
  if (!i18nInstance) return false
  return i18nInstance.exists(key, options)
}

/**
 * Đổi ngôn ngữ hiện tại
 *
 * @param {string} lng - Language code (e.g., 'en', 'vi')
 * @returns {Promise<void>}
 */
export function changeLanguage(lng) {
  if (!i18nInstance) {
    console.warn('i18n not initialized. Call initI18n() first.')
    return Promise.resolve()
  }
  return i18nInstance.changeLanguage(lng)
}

/**
 * Lấy ngôn ngữ hiện tại
 *
 * @returns {string | undefined}
 */
export function getCurrentLanguage() {
  return i18nInstance?.language
}
