import config from '@/configs'
import { Router } from 'express'

import { HTTP_STATUS } from '@/core/constants'
import { HttpResponse } from '@/core/helpers'

import { PaginatedResponse, t } from '@/framework/helpers'
import { setCache } from '@/framework/helpers/cache.helper'
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
  wrapController(async req => {
    return new HttpResponse(
      HTTP_STATUS.CREATED,
      await postCrudUsecase.createOnePostUsecase(req.body),
      t('common:system.service_name')
    )
  })
)
router.patch(
  '/:id',
  requestValidator(updateOneDto),
  wrapController(async req => {
    return postCrudUsecase.updateOnePostUsecase(req.params, req.body)
  })
)

router.get(
  '/',
  requestValidator(getListDto),
  wrapController(async req => {
    const resp = await setCache({
      model: 'post',
      alias: 'post-getList',
      expire: config.redis.defaultTTL,
      queryParams: {
        ...req.query,
        nested: {
          author: {
            name: 'John Doe',
            cities: ['Hanoi', 'HoChiMinh', 'DaNang'],
            age: 20,
          },
        },
      },
    })

    const { list, total } = await postCrudUsecase.getListPostUsecase(req.query)
    return new PaginatedResponse(list, {
      page: req.query.page,
      limit: req.query.limit,
      total,
      resp,
    })
  })
)

router.get(
  '/:id',
  requestValidator(getDetailDto),
  wrapController(async req => {
    return new HttpResponse(
      HTTP_STATUS.OK,
      await postCrudUsecase.getDetailPostUsecase(req.params)
    )
  })
)

router.delete(
  '/:id',
  requestValidator(deleteOneDto),
  wrapController(async req => {
    return new HttpResponse(
      HTTP_STATUS.OK,
      await postCrudUsecase.deleteOnePostUsecase(req.params)
    )
  })
)

export default router
