import { Document, SchemaTypes } from 'mongoose'

import { isObject, mergeOptions, pick } from '@/core/utils'

/**
 * @returns {{ id: any, name: any, email: any } | null}
 */
export const getAuthor = viewer => {
  if (!viewer || !isObject(viewer)) return null

  return {
    id: viewer.id,
    name: viewer.name,
    email: viewer.email,
  }
}

export const buildAuditData = (viewer, options) => {
  const { created, updated, defaultViewer } = mergeOptions(options, {
    created: true,
    updated: true,
    defaultViewer: {
      id: null,
      name: '',
      email: '',
    },
  })

  if (!created && !updated) return {}

  const userInfo = getAuthor(viewer) || defaultViewer || {}
  const result = {}
  if (created) result.createdBy = { ...userInfo }
  if (updated) result.updatedBy = { ...userInfo }

  return result
}

export const defaultField = {
  bizId: 1,
  createdAt: 1,
  updatedAt: 1,
}

export const defaultFields = Object.keys(defaultField)

export const auditField = {
  createdBy: 1,
  updatedBy: 1,
}

export const auditFields = Object.keys(auditField)

export const softDeleteField = {
  deletedAt: 1,
  isDeleted: 1,
  deletedBy: 1,
}

export const softDeleteFields = Object.keys(softDeleteField)

export const SYS_CREATED_FROM = {
  PRIVATE_API: 'private-api',
  BACKDOOR: 'backdoor',
  QUEUE_PROCESS: 'queue-process',
  ADMIN_PANEL: 'admin-panel',
  MIGRATION: 'migration',
}

/**
 * @param {Object} options
 * @param {string} options.serviceName - Service name
 * @param {string} options.context - Context: SYS_CREATED_FROM
 * @returns {Object}
 */
export const buildSysCreatedFrom = options => {
  const { serviceName, context } = mergeOptions(options, {
    serviceName: 'N/A',
    context: SYS_CREATED_FROM.PRIVATE_API,
  })

  return `${serviceName}.${context}`
}

/**
 * @param {Object} options
 * @param {string} options.correlationId - Correlation ID
 * @param {string} options.sysCreatedFrom - Data created from
 * @returns {Object}
 */
export const buildMetadata = options => {
  const { correlationId, sysCreatedFrom } = mergeOptions(options, {
    correlationId: null,
    sysCreatedFrom: SYS_CREATED_FROM.PRIVATE_API,
  })

  return {
    _correlationId: correlationId,
    _sysCreatedFrom: sysCreatedFrom,
  }
}

export const commonSchemaField = {
  bizId: { type: SchemaTypes.ObjectId, required: true },
  createdBy: {
    id: { type: SchemaTypes.ObjectId, default: null },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  updatedBy: {
    id: { type: SchemaTypes.ObjectId, default: null },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  _metadata: {
    type: SchemaTypes.Mixed,
    default: {},
  },
}

export const commonSchemaOption = {
  timestamps: true,
}

export const softDeleteSchemaField = {
  deletedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedBy: {
    id: { type: SchemaTypes.ObjectId, default: null },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
  },
}

export const standardizeDocumentWithFields = (doc, exposedFields = []) => {
  if (!doc) return null

  if (!Array.isArray(exposedFields)) exposedFields = []
  const fields = [
    ...auditFields,
    ...defaultFields,
    ...softDeleteFields,
    ...exposedFields,
  ]
  const plainDoc = doc instanceof Document ? doc.toObject() : doc
  const standardedDoc = pick(plainDoc, fields)
  standardedDoc.id = doc._id || doc.id

  return standardedDoc
}
