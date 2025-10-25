/*
 * Author: Dzung Dang
 */
import morgan from 'morgan'

import { CURRENT_ENV, ENVIRONMENT } from '@/core/constants'
import { logger, requestContextHelper } from '@/core/helpers'

const SKIP_PATHS = ['/healthz', '/favicon']
const isProduction = CURRENT_ENV === ENVIRONMENT.PRODUCTION

// Tạo stream chuyển log về Winston (level http)
const stream = {
  write: message => logger.http(message.trim()),
}

// Bỏ qua log không cần thiết
const skip = req => {
  return SKIP_PATHS.includes(req.originalUrl)
}

// Tùy chọn token thêm context
morgan.token(
  'id',
  () => requestContextHelper.getContextValue('requestId') || '-'
)
morgan.token(
  'user',
  () => requestContextHelper.getContextValue('userId') || 'anonymous'
)

// Format tùy chỉnh (dễ đọc & phân tích)
const format = `${isProduction ? ':remote-addr' : ''} :method :url :status :res[content-length] - :response-time ms [userId=:user reqId=:id]`

let requestLogger = (_req, _res, next) => next()
if ([ENVIRONMENT.PRODUCTION, ENVIRONMENT.STAGING].includes(CURRENT_ENV))
  requestLogger = morgan(format, { stream, skip })
else if (CURRENT_ENV === ENVIRONMENT.DEVELOPMENT)
  requestLogger = morgan(format, { stream })

export { requestLogger }
