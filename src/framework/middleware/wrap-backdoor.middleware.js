import { InternalServerError, logger } from '@/core/helpers'
import { isPlainObject } from '@/core/utils'

export const wrapBackdoor = (backdoorFnMap = {}) => {
  console.log(`[wrap-backdoor.middleware.js] backdoorFnMap:`, backdoorFnMap)
  if (!isPlainObject(backdoorFnMap)) {
    throw new InternalServerError('backdoorFnMap must be a plain object')
  }

  const methodNames = Object.keys(backdoorFnMap)
  logger.info('Supported backdoor methods:', methodNames)

  return async (req, res, next) => {
    if (!Array.isArray(req.body) || !req.body.length) {
      next(new Error('Invalid request body'))
      // new
      return
    }

    res.json({
      backdoor: req.backdoor,
    })
  }
}
