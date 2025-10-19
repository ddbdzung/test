import { Joi } from '@/core/helpers/validator.helper'

import { stdGetListQueryParams } from '@/framework/helpers'

export const createOneDto = {
  body: Joi.object({
    title: Joi.string().required(),
    content: Joi.string().optional(),
  }),
}

export const updateOneDto = {
  params: Joi.object({
    id: Joi.number().required(),
  }),
  body: Joi.object({
    title: Joi.string().optional(),
    content: Joi.string().optional(),
  })
    .min(1)
    .required(),
}

export const getListDto = {
  query: stdGetListQueryParams,
}

export const getDetailDto = {
  params: Joi.object({
    id: Joi.number().required(),
  }),
}

export const deleteOneDto = {
  params: Joi.object({
    id: Joi.number().required(),
  }),
}
