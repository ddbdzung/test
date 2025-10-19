import { Types } from 'mongoose'

const mongoIdPattern = new RegExp(/^[0-9a-f]{24}$/)

export const isValidObjectIdString = value => {
  if (typeof value === 'string') {
    return mongoIdPattern.test(value)
  }

  return false
}

export const makeObjectId = value => {
  if (!value) return new Types.ObjectId()

  if (!isValidObjectIdString(value)) return value

  return new Types.ObjectId(value)
}

export const isSameObjectId = (a, b) => {
  if (!a || !b) return false

  try {
    const idA = a instanceof Types.ObjectId ? a : new Types.ObjectId(a)
    const idB = b instanceof Types.ObjectId ? b : new Types.ObjectId(b)
    return idA.equals(idB)
  } catch {
    return false // nếu a hoặc b không phải là ObjectId hợp lệ
  }
}

/**
 * @example Joi.string().custom(isMongoIdDto)
 */
export const isMongoIdDto = (value, helpers) => {
  if (!isValidObjectIdString(value)) {
    return helpers.error(`${value} is not a valid MongoDB ObjectId`)
  }

  return value
}

/**
 * @example Joi.string().custom(isMongoIdDto).custom(makeMongoIdDto)
 */
export const makeMongoIdDto = value => {
  return makeObjectId(value)
}

/**
 * @example Joi.string().custom(toMongoIdDto)
 */
export const toMongoIdDto = (value, helpers) => {
  if (!isValidObjectIdString(value)) {
    return helpers.error(`${value} is not a valid MongoDB ObjectId`)
  }

  return makeObjectId(value)
}
