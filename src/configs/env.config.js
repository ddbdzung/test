import 'dotenv/config'

import { Joi } from '@/core/helpers/validator.helper'

const _schema = {
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
}
