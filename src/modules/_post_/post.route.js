import { Router } from 'express'

import { HTTP_STATUS } from '@/core/constants'
import { HttpResponse } from '@/core/helpers'

import { requestValidator, wrapController } from '@/framework/middleware'

import { postCrudUsecase } from './usecases/post-crud.usecase'
import { createOne } from './validators/post.validator'

const router = Router()

router.post(
  '/',
  requestValidator(createOne),
  wrapController(async req => {
    return new HttpResponse(
      HTTP_STATUS.CREATED,
      await postCrudUsecase.createOnePostUsecase(req.body),
      'Post created successfully'
    )
  })
)

export default router
