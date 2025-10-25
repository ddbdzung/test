/*
 * Author: Dzung Dang
 */
import { NotFoundError } from '@/core/helpers'

export const notFound = (req, res, next) => {
  const notFoundError = new NotFoundError('', req.originalUrl)
  res.status(notFoundError.statusCode).json(notFoundError.toJSON())
  next()
}
