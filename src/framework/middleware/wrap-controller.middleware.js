export const wrapController = (controllerFn, options = {}) => {
  return async (req, res, next) => {
    try {
      const result = await controllerFn(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}
