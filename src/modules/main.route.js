import config from '@/configs'
import { Router } from 'express'

import { bizAuth } from '@/framework/middleware/auth.middleware'

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

export default router
