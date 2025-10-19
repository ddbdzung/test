/*
# Winston log level
| Level     | Priority | Meaning                                                                                                 |  Support |
| --------- | -------- | ------------------------------------------------------------------------------------------------------- | -------- |
| `error`   | 0        | Something failed — code couldn’t continue normally. You usually alert on this.                          |    ✅    |
| `warn`    | 1        | Something unexpected happened, but the app can continue. E.g., deprecated API, missing optional config. |    ✅    |
| `info`    | 2        | General operational messages — app started, user logged in, task completed, etc.                        |    ✅    |
| `http`    | 3        | (optional, user-defined) HTTP-specific events — request logs, status codes, latency.                    |    ✅    |
| `verbose` | 4        | Detailed info for tracing complex flows — e.g., database query results.                                 |    ✅    |
| `debug`   | 5        | Debugging messages, usually turned on only in development.                                              |    ✅    |
| `silly`   | 6        | Extremely fine-grained, often noisy — like internal state dumps.                                        |    ❌    |
*/
import path from 'path'
import util from 'util'
import winston from 'winston'
import 'winston-daily-rotate-file'

import {
  CURRENT_ENV,
  ENVIRONMENT,
  LOG_LEVEL,
} from '@/constants/common.constant.js'

import { requestContextHelper } from '@/core/helpers/request-context.helper'

const defaultLogLevel = LOG_LEVEL.INFO
const isTestEnv = CURRENT_ENV === ENVIRONMENT.TEST
const isProductionEnv = CURRENT_ENV === ENVIRONMENT.PRODUCTION
const ENABLE_CALLER_TRACKING = !isProductionEnv

// Cached patterns cho performance
const STACK_REGEX = /\((.*):(\d+):(\d+)\)|at\s+(.*):(\d+):(\d+)/
const currentFileName = path.basename(__filename)
const shouldSkipFrame = line =>
  line.includes('node_modules') || line.includes(currentFileName)

const COLOR = {
  CYAN: '\x1b[36m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RESET: '\x1b[0m',
  GRAY: '\x1b[90m',
  BLUE: '\x1b[34m',
}

const COLOR_BY_LEVEL = {
  [LOG_LEVEL.ERROR]: COLOR.RED,
  [LOG_LEVEL.WARN]: COLOR.YELLOW,
  [LOG_LEVEL.INFO]: COLOR.GREEN,
  [LOG_LEVEL.DEBUG]: COLOR.CYAN,
  [LOG_LEVEL.HTTP]: COLOR.BLUE,
}

/** Helper */
const colorizeText = (text, color) => `${color}${text}${COLOR.RESET}`

/**
 * Trả về file + line của caller thật - optimized version
 * Improvements:
 * - Removed console.log (critical bug fix)
 * - Reduced path operations
 * - Early return optimization
 * - Cleaner path handling
 */
function getCallerInfo() {
  // Early return nếu không có stack
  const stack = new Error().stack
  if (!stack) return null

  const lines = stack.split('\n')

  // Scan từ line 1 (skip "Error"), tìm frame đầu tiên không phải internal
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]

    // Skip internal frames sớm nhất có thể
    if (shouldSkipFrame(line)) continue

    const match = STACK_REGEX.exec(line)
    if (!match) continue

    // Match group: [full, path1, line1, col1, path2, line2, col2]
    const filePath = match[1] || match[4]
    const lineNumber = match[2] || match[5]

    // Early return nếu không có filePath
    if (!filePath) continue

    // Normalize file:// URLs và tính relative path một lần
    const normalizedPath = filePath.replace(/^file:\/\//, '')
    const relativePath = path.relative(process.cwd(), normalizedPath)

    // Tối ưu: tính toán path một lần duy nhất
    const pathParts = relativePath.split(path.sep)
    const fileName = pathParts[pathParts.length - 1]
    const parentDir =
      pathParts.length > 1 ? pathParts[pathParts.length - 2] : ''

    // Format: parentDir/fileName (ví dụ: controllers/user.controller.js)
    const displayPath = parentDir ? `${parentDir}/${fileName}` : fileName

    return {
      file: displayPath,
      line: lineNumber,
      filePath: relativePath,
    }
  }

  return null
}

function formatArgument(arg) {
  if (arg == null) return String(arg)
  if (typeof arg !== 'object') return String(arg)

  return util.inspect(arg, {
    depth: isProductionEnv ? 2 : Infinity,
    colors: false,
  })
}

/** Lấy log level tùy theo env */
function getConsoleLogLevel(CURRENT_ENV) {
  if (CURRENT_ENV === ENVIRONMENT.PRODUCTION) return LOG_LEVEL.INFO
  if (CURRENT_ENV === ENVIRONMENT.DEVELOPMENT) return LOG_LEVEL.DEBUG
  if (CURRENT_ENV === ENVIRONMENT.STAGING) return LOG_LEVEL.VERBOSE
  return defaultLogLevel
}

function getFileLogLevel(CURRENT_ENV) {
  if (CURRENT_ENV === ENVIRONMENT.PRODUCTION) return LOG_LEVEL.ERROR
  if (CURRENT_ENV === ENVIRONMENT.DEVELOPMENT) return LOG_LEVEL.DEBUG
  if (CURRENT_ENV === ENVIRONMENT.STAGING) return LOG_LEVEL.VERBOSE
  return defaultLogLevel
}

/** Format bổ sung caller */
const callerFormat = winston.format(info => {
  if (!ENABLE_CALLER_TRACKING) return info
  const caller = getCallerInfo()
  if (caller) info.caller = caller
  return info
})

/** Format xử lý %s, %d, etc. */
const splatFormat = winston.format(info => {
  const args = info[Symbol.for('splat')]
  if (Array.isArray(args) && args.length > 0) {
    info.message = util.format(info.message, ...args.map(formatArgument))
  } else if (typeof info.message === 'object') {
    info.message = formatArgument(info.message)
  }
  delete info[Symbol.for('splat')]
  return info
})

/** Format cho error object */
const errorFormat = winston.format(info => {
  if (info instanceof Error) {
    return {
      ...info,
      message: info.message,
      stack: info.stack,
    }
  }
  if (info.message instanceof Error) {
    const err = info.message
    info.message = err.message
    info.stack = err.stack
  }
  return info
})

/** Format hiển thị console đẹp */
const consoleFormat = winston.format.printf(info => {
  const level = colorizeText(
    info.level.toUpperCase().padEnd(5),
    COLOR_BY_LEVEL[info.level] || COLOR.RESET
  )

  const timestamp = colorizeText(info.timestamp, COLOR.GRAY)
  const ms = colorizeText(info.ms ?? '', COLOR.CYAN)
  const callerInfo =
    info.caller && info.level !== LOG_LEVEL.HTTP
      ? colorizeText(
          `(${info.caller?.['file']}:${info.caller?.['line']})`,
          COLOR.GRAY
        ) + ' '
      : ''

  const stackTrace =
    info.stack && info.level !== LOG_LEVEL.HTTP
      ? '\n' + colorizeText(info.stack, COLOR.RED)
      : ''

  return `[${timestamp} ${level}] ${callerInfo}${info.message} ${ms}${stackTrace}`
})

const contextFormat = winston.format(info => {
  const requestId = requestContextHelper.getContextValue('requestId')
  if (requestId) info.requestId = requestId
  const userId = requestContextHelper.getContextValue('userId')
  if (userId) info.userId = userId

  return info
})

/** Build pipeline */
const commonFormats = [
  errorFormat(),
  contextFormat(),
  ...(ENABLE_CALLER_TRACKING ? [callerFormat()] : []),
  splatFormat(),
  winston.format.ms(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
]

/** Format cho file - loại bỏ caller để giảm kích thước */
const fileFormat = winston.format(info => {
  const { caller: _caller, ...rest } = info
  return rest
})

/** Logger setup */
const logger = winston.createLogger({
  silent: isTestEnv,
  level: defaultLogLevel,
  format: winston.format.combine(...commonFormats),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: '%DATE%-error.log',
      dirname: path.join(process.cwd(), 'logs'),
      level: getFileLogLevel(CURRENT_ENV),
      format: winston.format.combine(fileFormat(), winston.format.json()),
      datePattern: 'DD-MM-YYYY',
      maxFiles: '7d',
    }),
    new winston.transports.Console({
      silent: isTestEnv,
      level: getConsoleLogLevel(CURRENT_ENV),
      stderrLevels: [LOG_LEVEL.ERROR],
      format: consoleFormat,
    }),
  ],
})

export default logger
