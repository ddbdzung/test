import config from '@/configs'
import { Router } from 'express'

import { HTTP_STATUS } from '@/core/constants'
import { Joi } from '@/core/helpers'

import { SmaxResponse } from '@/framework/helpers/backdoor.helper'
import { backdoorAuth, bizAuth } from '@/framework/middleware/auth.middleware'
import { wrapBackdoor } from '@/framework/middleware/wrap-backdoor.middleware'

import postRoutes from './_post_/post.route'

const router = Router()
const mainRoutes = [
  {
    path: 'posts',
    routes: postRoutes,
  },
]

mainRoutes.forEach(({ path, routes }) => {
  router.use(`/bizs/:bizAlias/${config.service}/${path}`, bizAuth(), routes)
})

router.post(
  `/${config.service}`,
  backdoorAuth,
  wrapBackdoor({
    ping: {
      // eslint-disable-next-line no-unused-vars
      fn: ({ data, query, options, backdoor }) => {
        return new SmaxResponse(HTTP_STATUS.OK, null, `${config.service}: pong`)
      },
      validator: Joi.object({
        data: Joi.object({
          msg: Joi.string().required().description('Message'),
          extra: Joi.string().optional().default('default extra'),
        })
          .unknown(true)
          .required(),
      })
        .unknown(true)
        .required(),
    },
  })
)

export default router
