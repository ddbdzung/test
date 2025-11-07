import pLimit from 'p-limit'

import { HTTP_STATUS, HTTP_STATUS_MESSAGE } from '@/core/constants'
import { InternalServerError, Joi, logger } from '@/core/helpers'
import { isPlainObject, omit, pick } from '@/core/utils'

import {
  BackdoorError,
  SmaxResponse,
  buildStatusText,
} from '@/framework/helpers/backdoor.helper'

const bodyRequestValidator = Joi.array()
  .items(
    Joi.object({
      data: Joi.any().optional(),
      query: Joi.any().optional(),
      options: Joi.any().optional(),
      method: Joi.string().required('Method is required'),
      methodId: Joi.alternatives()
        .try(Joi.string(), Joi.number())
        .optional()
        .description('Method ID'),
    }).xor('data', 'query')
  ) // 1 trong 2 phải có / required
  .min(1)
  .required('Body is required')

/**
 * Creates an Express middleware that handles batch backdoor API requests with concurrent execution limit.
 * Each request in the batch is validated and executed in parallel while respecting the concurrency limit.
 *
 * @param {Object.<string, {fn: Function, validator: Joi.Schema}>} backdoorFnMap - Map of backdoor method handlers
 * @param {Function} backdoorFnMap[method].fn - Handler function for the backdoor method.
 *                                               Receives `{data, query, options, backdoor}` and returns data or SmaxResponse
 * @param {Joi.Schema} backdoorFnMap[method].validator - Joi schema to validate the request body for this method
 * @param {number} [limitConcurrent=30] - Maximum number of concurrent backdoor executions (must be positive integer)
 *
 * @returns {Function} Express middleware function `(req, res, next) => Promise<void>`
 *
 * @throws {InternalServerError} If backdoorFnMap is not a plain object or limitConcurrent is invalid
 *
 * @example
 * // Define backdoor methods
 * const backdoorMap = {
 *   getUserById: {
 *     fn: async ({ data }) => {
 *       const user = await User.findById(data.id)
 *       return { user }
 *     },
 *     validator: Joi.object({
 *       data: Joi.object({
 *         id: Joi.string().required()
 *       }).required()
 *     })
 *   },
 *   searchUsers: {
 *     fn: async ({ query }) => {
 *       return await User.find(query)
 *     },
 *     validator: Joi.object({
 *       query: Joi.object({
 *         name: Joi.string().optional(),
 *         age: Joi.number().optional()
 *       }).required()
 *     })
 *   }
 * }
 *
 * // Use in Express route
 * router.post('/backdoor', wrapBackdoor(backdoorMap, 50))
 *
 * // Request body format:
 * // POST /backdoor
 * // [
 * //   { method: "getUserById", data: { id: "123" }, methodId: "req1" },
 * //   { method: "searchUsers", query: { name: "John" }, methodId: "req2" }
 * // ]
 *
 * // Response format:
 * // {
 * //   status: 200,
 * //   data: [
 * //     {
 * //       method: "getUserById",
 * //       methodId: "req1",
 * //       response: { status: 200, statusText: "OK", message: null, data: {...} }
 * //     },
 * //     {
 * //       method: "searchUsers",
 * //       methodId: "req2",
 * //       response: { status: 200, statusText: "OK", message: null, data: [...] }
 * //     }
 * //   ]
 * // }
 */
export const wrapBackdoor = (backdoorFnMap = {}, limitConcurrent = 30) => {
  if (!isPlainObject(backdoorFnMap)) {
    throw new InternalServerError('backdoorFnMap must be a plain object')
  }

  if (
    typeof limitConcurrent !== 'number' ||
    !Number.isInteger(limitConcurrent) ||
    limitConcurrent <= 0
  ) {
    throw new InternalServerError(
      'Limit concurrent must be a positive integer',
      { isOperational: false }
    )
  }

  const limitFn = pLimit(limitConcurrent)
  const methodNames = new Set(Object.keys(backdoorFnMap))
  logger.info('Supported backdoors:', Array.from(methodNames))

  return async (req, res, next) => {
    const { error: errorValidate, value: validatedBody } = Joi.compile(
      bodyRequestValidator
    ).validate(req.body)

    if (errorValidate) {
      next(
        new BackdoorError(undefined, {
          metadata: {
            errors: errorValidate.details.map(d => ({
              field: d.path.join('.'),
              type: d.type,
              message: d.message,
            })),
          },
        }).isBadRequest()
      )
      return
    }

    const incomingBodyMethodNames = validatedBody.map(b => b.method)
    const unsupportedMethodNames = incomingBodyMethodNames.filter(
      methodName => !methodNames.has(methodName)
    )
    if (unsupportedMethodNames.length) {
      next(
        new BackdoorError(
          `Unsupported method: ${unsupportedMethodNames.join(', ')}`
        ).isBadRequest()
      )
      return
    }

    try {
      const results = await Promise.all(
        validatedBody.map(body =>
          limitFn(async () => {
            const metadata = { method: body.method, methodId: body.methodId }
            try {
              const { fn, validator } = backdoorFnMap[body.method]

              const { error: bodyError, value: bodyValue } =
                Joi.compile(validator).validate(body)
              if (bodyError) {
                throw new BackdoorError(bodyError.message, {
                  metadata: {
                    errors: bodyError.details.map(d => ({
                      field: d.path.join('.'),
                      type: d.type,
                      message: d.message,
                    })),
                  },
                }).isBadRequest()
              }

              const resp = await fn({
                data: bodyValue.data,
                query: bodyValue.query,
                options: bodyValue.options,
                backdoor: req.backdoor,
              })

              // Support both SmaxResponse and directly return data
              if (resp instanceof SmaxResponse) {
                resp.metadata = {
                  ...(resp.metadata || {}),
                  ...metadata,
                }

                return resp
              }

              if (resp instanceof BackdoorError) {
                resp.metadata = {
                  ...(resp.metadata || {}),
                  ...metadata,
                }
                resp.data = resp.data || null
                return resp
              }

              return new SmaxResponse(HTTP_STATUS.OK, resp, undefined, metadata)
            } catch (error) {
              if (error instanceof SmaxResponse) {
                error.metadata = {
                  ...(error.metadata || {}),
                  ...metadata,
                }

                return error
              }

              if (error instanceof BackdoorError) {
                error.metadata = {
                  ...(error.metadata || {}),
                  ...metadata,
                }
                error.data = error.data || null

                return new SmaxResponse(
                  error.getStatusCode(),
                  error.data,
                  error.message,
                  error.metadata
                )
              }

              logger.error('UNHANDLED_BACKDOOR_ERROR', { error, metadata })

              return new SmaxResponse(
                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                null,
                HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR,
                metadata
              )
            }
          })
        )
      )

      const response = new SmaxResponse(
        HTTP_STATUS.OK,
        results.map(result => {
          return {
            ...(pick(result.metadata, ['method', 'methodId']) || {}),
            response: {
              status: result.getStatusCode(),
              statusText: buildStatusText(result.getStatusCode()),
              message: result.message,
              data: result.data,
              ...omit(result.metadata, ['method', 'methodId']),
            },
          }
        })
      )

      res.status(response.getStatusCode()).json(response.toJSON())
      next()
    } catch (error) {
      next(error)
    }
  }
}
