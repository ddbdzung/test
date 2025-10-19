import { Joi } from '@/core/helpers/validator.helper'

export const createOne = {
  body: Joi.object({
    title: Joi.string().required(),
    content: Joi.string().optional(),
  }),
}
