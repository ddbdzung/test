import mongoose from 'mongoose'

const { Schema } = mongoose

/** Trạng thái job (Bull-style) */
export const JOB_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DELAYED: 'delayed',
}

/** Loại job */
export const JOB_TYPE = {
  BDS_CRAWL: 'bds_crawl',
  BDS_CRAWL_LIST: 'bds_crawl_list',
  BDS_CRAWL_DETAIL: 'bds_crawl_detail',
}

const jobSchema = new Schema(
  {
    type: { type: String, required: true, index: true },
    data: { type: Schema.Types.Mixed, default: {} },
    opts: {
      priority: { type: Number, default: 0 },
      attempts: { type: Number, default: 0 },
      maxAttempts: { type: Number, default: 3 },
      delay: { type: Date },
    },
    status: {
      type: String,
      enum: Object.values(JOB_STATUS),
      default: JOB_STATUS.PENDING,
      index: true,
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    hits: { type: Number, default: 0 },
    result: { type: Schema.Types.Mixed },
    failedReason: { type: String },
    stackTrace: { type: String },
    processedOn: { type: Date },
    finishedOn: { type: Date },
  },
  {
    timestamps: true,
    strict: true,
  }
)

jobSchema.index({ status: 1, createdAt: 1 })
jobSchema.index({ status: 1, 'opts.priority': -1, createdAt: 1 })

const JOB_MODEL_NAME = 'Job'

export function getJobModel() {
  try {
    return mongoose.model(JOB_MODEL_NAME)
  } catch {
    return mongoose.model(JOB_MODEL_NAME, jobSchema)
  }
}

export default jobSchema
