import { Router } from 'express'

import { PaginatedResponse, getCache, setCache } from '@/framework/helpers'
import { requestValidator, wrapController } from '@/framework/middleware'

import { postCrudUsecase } from './usecases/post-crud.usecase'
import {
  createOneDto,
  deleteOneDto,
  getDetailDto,
  getListDto,
  updateOneDto,
} from './validators/post.validator'

const router = Router()

router.post(
  '/',
  requestValidator(createOneDto),
  wrapController(async req => postCrudUsecase.createOnePostUsecase(req.body))
)

router.patch(
  '/:id',
  requestValidator(updateOneDto),
  wrapController(async req =>
    postCrudUsecase.updateOnePostUsecase(req.params, req.body)
  )
)

router.get(
  '/',
  requestValidator(getListDto),
  wrapController(async req => {
    const cache = await getCache({
      model: 'post',
      alias: 'post-getList',
      queryParams: req.query,
    })
    if (cache.success && cache.data) {
      return new PaginatedResponse(cache.data.list, {
        page: req.query.page,
        limit: req.query.limit,
        total: cache.data.total,
      })
    }

    const { list, total } = await postCrudUsecase.getListPostUsecase(req.query)

    await setCache({
      model: 'post',
      alias: 'post-getList',
      queryParams: req.query,
      data: {
        list,
        total,
      },
      expire: 60,
    })

    return new PaginatedResponse(list, {
      page: req.query.page,
      limit: req.query.limit,
      total,
    })
  })
)

router.get(
  '/:id',
  requestValidator(getDetailDto),
  wrapController(async req => postCrudUsecase.getDetailPostUsecase(req.params))
)

router.delete(
  '/:id',
  requestValidator(deleteOneDto),
  wrapController(async req => postCrudUsecase.deleteOnePostUsecase(req.params))
)

export default router
