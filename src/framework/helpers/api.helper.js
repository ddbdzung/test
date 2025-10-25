/*
 * Author: Dzung Dang
 */
import { HTTP_STATUS, HTTP_STATUS_MESSAGE } from '@/core/constants'
import { HttpResponse, Joi } from '@/core/helpers'

const SORT_BY_REGEX = /^[a-zA-Z0-9_-]+$/

// Guide: ?sorts=createdAt&sorts=-updatedAt => { sorts = ['createdAt', '-updatedAt'] }
// Guide: ?sortBy=createdAt => { sortBy = '-updatedAt' }
// Guide: ?fields=createdAt&fields=updatedAt => { fields = ['createdAt', 'updatedAt'] }
export const stdQueryParams = {
  page: Joi.number().default(1).min(1).optional(),
  limit: Joi.number().max(1_000).default(10).optional(),
  q: Joi.string().max(256).trim().optional(), // search term
  sortBy: Joi.string().pattern(SORT_BY_REGEX).optional(),
  fields: Joi.array().items(Joi.string()).min(1).optional(),
}

export const stdGetListQueryParams = Joi.object(stdQueryParams)

export class PaginatedResponse extends HttpResponse {
  constructor(data, metadata = {}, message = HTTP_STATUS_MESSAGE.OK) {
    super(HTTP_STATUS.OK, data, message, metadata)
  }

  toJSON() {
    const { page, limit, total, ...restMetadata } = this.metadata
    const totalPages = Math.ceil(total / limit)

    return {
      ...super.toJSON(),
      meta: {
        ...restMetadata,
        page,
        limit,
        total,
        totalPages,
      },
    }
  }
}
