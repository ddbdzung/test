import { BaseError, HttpResponse } from '@/core/helpers'

export class BackdoorError extends BaseError {
  constructor(message, options = {}) {
    super(message, options)
  }

  toJSON() {
    const resp = new HttpResponse(
      this.statusCode,
      null,
      this.message,
      this.metadata
    )
  }
}
