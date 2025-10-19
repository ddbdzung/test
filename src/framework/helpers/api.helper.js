import { Joi } from '@/core/helpers'

// Guide: ?sorts=createdAt&sorts=-updatedAt => { sorts = ['createdAt', '-updatedAt'] }
// Guide: ?fields=createdAt&fields=updatedAt => { fields = ['createdAt', 'updatedAt'] }
export const stdQueryParams = {
  page: Joi.number().default(1).min(1).optional(),
  limit: Joi.number().max(1_000).default(10).optional(),
  q: Joi.string().max(256).trim().optional(), // search term
  sorts: Joi.array().items(Joi.string()).min(1).optional(),
  fields: Joi.array().items(Joi.string()).min(1).optional(),
}

export const stdGetListQueryParams = Joi.object(stdQueryParams)
