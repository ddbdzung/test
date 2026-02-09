import util from 'util'

import { Joi } from '@/core/helpers'

// const OPERATORS_SQL = {
//   EQ: '=', // Default
//   NE: '!=',
//   GT: '>',
//   GTE: '>=',
//   LT: '<',
//   LTE: '<=',
//   IN: 'IN', // Handle array/comma
//   NIN: 'NOT IN',
//   LIKE: 'LIKE', // %value%
//   SW: 'LIKE', // value% (Starts With)
//   EW: 'LIKE', // %value (Ends With)
//   EXISTS: 'IS NOT NULL', // true/false check
// }

const OPERATOR = {
  EQ: 'eq',
  NE: 'ne',
  GT: 'gt',
  GTE: 'gte',
  LT: 'lt',
  LTE: 'lte',
  IN: 'in',
  NIN: 'nin',
  LIKE: 'like',
  SW: 'sw',
  EW: 'ew',
  EXISTS: 'exists',
}

export function queryParser() {
  // Luôn bỏ qua việc throw lỗi nếu tham số query truyền vào không hợp lệ, thay vào đó sẽ sử dụng giá trị mặc định (nếu có) của field đó, hoặc skip nếu không có giá trị default
  // Ngoài ra các lỗi sẽ được gửi 1 tín hiệu thông báo tới 1 nơi nào đó để xử lý sau (có thể là discord /slack / telegram bot channel)
  return function (req, res, next) {
    console.log('-> start query parser')
    console.log(
      'req.query',
      util.inspect(req.query, { depth: null, colors: true })
    )
    console.log('-> end query parser')
    next()
  }
}

// Only used in URL query params
// sort: no space, comma-separated only. e.g. ?sort=createdAt,updatedAt or ?sort=-createdAt,updatedAt
const SORT_BY_REGEX = /^[a-zA-Z0-9_,-]+$/
const FIELDS_REGEX = /^[a-zA-Z0-9_,]+$/ // example: name,age,createdAt,updatedAt,...
export const stdQuery = {
  page: Joi.number().min(1).max(Number.MAX_SAFE_INTEGER).optional(),
  cursor: Joi.string()
    .allow('')
    .trim()
    .max(256)
    .base64()
    .optional()
    .custom(v => (v === '' ? null : v)),
  limit: Joi.number().min(1).max(1_000).optional().default(10),
  q: Joi.string()
    .allow('')
    .trim()
    .max(256)
    .optional()
    .custom(v => (v === '' ? null : v)),
  fields: Joi.string()
    .allow('')
    .trim()
    .pattern(FIELDS_REGEX)
    .max(2000)
    .optional()
    .custom(v => (v === '' ? null : v)),
  sort: Joi.string()
    .allow('')
    .trim()
    .max(256)
    .pattern(SORT_BY_REGEX)
    .optional()
    .custom(v => (v === '' ? null : v)),
}

export const parseQueryDto = queryObj => {
  const result = {
    page: undefined,
    cursor: undefined,
    limit: limit || 10,
    q: undefined,
    fields: undefined,
    sort: undefined,
    isCursorBased: false,
  }
  const { page, cursor, limit, q, fields, sort } = queryObj

  if (page == null && cursor == null) {
    result.page = 1
    result.isCursorBased = false
  } else if (page == null && cursor != null) {
    result.cursor = Buffer.from(cursor, 'base64').toString('utf8')
    result.isCursorBased = true
  } else if (page != null && cursor == null) {
    result.page = page > 0 ? page : 1
    result.isCursorBased = false
  } else {
    // Prefer page over cursor
    result.page = page > 0 ? page : 1
    result.isCursorBased = false
  }

  if (q != null) {
    result.q = q
  }

  if (fields != null) {
    const computedFields = fields
      .split(',')
      .map(f => f.trim())
      .filter(f => f !== '')

    if (computedFields.length > 0) {
      result.fields = computedFields
    }
  }

  if (sort != null) {
    const computedSort = sort
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '')

    if (computedSort.length > 0) {
      result.sort = computedSort
    }
  }

  return result
}

export const stdQueryDto = Joi.object(stdQuery)
  .unknown(true)
  .custom(parseQueryDto)

export function buildQuery(query) {
  // Ensure query are cleaned and validated
  const { page, cursor, limit, q, sort, fields } = query
}
