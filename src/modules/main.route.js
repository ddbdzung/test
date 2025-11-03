import config from '@/configs'
import { Router } from 'express'

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
    ping: () => {
      return 'pong'
    },
  })
)

export default router
