import { Router } from 'express'

import postRoutes from './_post_/post.route'

const router = Router()

router.use('/posts', postRoutes)

export default router
