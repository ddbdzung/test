import mongoose from 'mongoose'

import { InternalServerError, logger } from '@/core/helpers'

import { registerShutdownTask } from '@/framework/shutdown.helper'

const mongoIdPattern = new RegExp(/^[0-9a-f]{24}$/)

export const isValidObjectIdString = value => {
  if (typeof value === 'string') {
    return mongoIdPattern.test(value)
  }

  return false
}

export const makeObjectId = value => {
  if (!value) return new mongoose.Types.ObjectId()

  if (!isValidObjectIdString(value)) return value

  return new mongoose.Types.ObjectId(value)
}

export const isSameObjectId = (a, b) => {
  if (!a || !b) return false

  try {
    const idA =
      a instanceof mongoose.Types.ObjectId ? a : new mongoose.Types.ObjectId(a)
    const idB =
      b instanceof mongoose.Types.ObjectId ? b : new mongoose.Types.ObjectId(b)
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

export const connectMongoDB = async (uri, options = {}) => {
  try {
    const conn = await mongoose.connect(uri, options)

    mongoose.connection.on('connected', () => {
      logger.info('✅ MongoDB: connected!')
    })

    mongoose.connection.on('error', err => {
      logger.error('❌ MongoDB: connection error:', { err })
      process.exit(-1)
    })

    return conn
  } catch (error) {
    logger.error('❌ MongoDB: something went wrong', { error })
    throw new InternalServerError('Failed to connect to MongoDB', error)
  }
}

export const disconnectMongoDB = async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close()
    logger.info('✅ MongoDB: disconnected!')
  }
}

registerShutdownTask(disconnectMongoDB, 'mongodb-disconnect')
