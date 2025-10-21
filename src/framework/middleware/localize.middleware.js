/*
 * Author: Dzung Dang
 */
import middleware from 'i18next-http-middleware'

import { getI18nInstance, initI18n } from '@/framework/helpers/i18n.helper.js'

/**
 * @typedef {import('i18next').InitOptions} I18nInitOptions
 */

/**
 * Middleware tích hợp i18n cho Express.js
 *
 * Cung cấp `req.t()` để translate trong controller.
 * Tự động phát hiện ngôn ngữ qua header / query / cookie.
 *
 * @param {Partial<I18nInitOptions> & {
 *   localesPath?: string
 * }} [options] - Cấu hình mở rộng cho i18n (override mặc định)
 * @returns {import('express').RequestHandler} Middleware Express sẵn sàng dùng
 *
 * @example
 * import { i18nMiddleware } from '@/framework/middleware/localize.middleware.js';
 *
 * app.use(i18nMiddleware({
 *   fallbackLng: 'en',
 *   preload: ['en', 'vi', 'es']
 * }));
 *
 * // Trong controller
 * app.get('/hello', (req, res) => {
 *   res.json({ message: req.t ('welcome') });
 * });
 */
export function i18nMiddleware(options = {}) {
  // Khởi tạo i18n instance qua helper
  const i18nInstance = initI18n(options)

  // Trả về middleware handler
  return middleware.handle(i18nInstance)
}

/**
 * Lấy i18n instance để sử dụng trong các trường hợp đặc biệt
 *
 * @returns {import('i18next').i18n | null}
 *
 * @example
 * import { getI18n } from '@/framework/middleware/localize.middleware.js';
 *
 * const i18n = getI18n();
 * if (i18n) {
 *   console.log(i18n.language);
 * }
 */
export function getI18n() {
  return getI18nInstance()
}
