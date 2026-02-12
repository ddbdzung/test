import mongoose from 'mongoose'

import { POST_MODEL_NAME } from './constants'

const { Schema } = mongoose

/** Schema lưu data cào được (crawler) - tương thích Post */
const crawlerPostSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    content: { type: String },
    images: { type: [String], default: [] },
    ownerId: { type: Schema.Types.ObjectId, ref: 'Account' },
    ownerName: { type: String },
    ownerPhone: { type: String },
    ownerEmail: { type: String },
    isGuestPost: { type: Boolean, required: true, default: true },
    renterId: { type: Schema.Types.ObjectId, ref: 'Account' },
    price: { type: Number, required: true },
    priceUnit: { type: String, default: 'month' },
    deposit: { type: Number, default: 0 },
    status: { type: String, default: 'pending_review' },
    publishedAt: { type: Date },
    expiredAt: { type: Date },
    rejectedAt: { type: Date },
    rejectedReason: { type: String },
    subId: { type: String, required: true },
    assetType: { type: String, required: true },
    assetName: { type: String },
    assetInfo: { type: Schema.Types.Mixed, default: {} },
    carDetails: { type: Schema.Types.Mixed, default: {} },
    propertyDetails: { type: Schema.Types.Mixed, default: {} },
    attributes: {
      type: [{ key: { type: String }, value: { type: Schema.Types.Mixed } }],
      default: [],
    },
    slug: { type: String },
    source: { type: String, required: true, default: 'bds.com.vn' },
    detailHref: { type: String },
    detailFetched: { type: Boolean, default: false },
    listRaw: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    strict: true,
  }
)

// Dedup: 1 post = 1 (source, subId). subId = ID nguồn từ URL (vd: -p799581.html).
crawlerPostSchema.index({ source: 1, subId: 1 }, { unique: true })
crawlerPostSchema.index({ detailFetched: 1, detailHref: 1 })

export default crawlerPostSchema

export function getPostModel() {
  try {
    return mongoose.model(POST_MODEL_NAME)
  } catch {
    return mongoose.model(POST_MODEL_NAME, crawlerPostSchema)
  }
}
