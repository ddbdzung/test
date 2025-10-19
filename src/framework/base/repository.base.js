import { InternalServerError } from '@/core/helpers'

// BASE REPOSITORY FOR MONGODB DATABASE - MONGOOSE ODM

/**
 * @typedef {Object} QueryOptions
 * @property {string[]|string|Object} [select] - Fields to select/project
 * @property {string[]|string|Object} [populate] - Relations to populate
 * @property {Object} [sort] - Sort order (e.g., { createdAt: -1 })
 * @property {number} [skip] - Number of documents to skip
 * @property {number} [limit] - Maximum number of documents to return
 * @property {Object} [transaction] - Transaction/session object
 */

/**
 * @typedef {Object} WriteOptions
 * @property {Object} [transaction] - Transaction/session object
 * @property {boolean} [new] - Return updated document (default: true)
 */

/**
 * @typedef {Object} UpsertOptions
 * @property {Object} [transaction] - Transaction/session object
 * @property {string} [uniqueField] - Field to match for upsert (default: '_id')
 */

/**
 * @typedef {Object} PaginationOptions
 * @property {number} [page=1] - Page number (1-indexed)
 * @property {number} [limit=10] - Items per page
 * @property {Object} [sort] - Sort order
 * @property {string[]|string|Object} [select] - Fields to select
 * @property {string[]|string|Object} [populate] - Relations to populate
 * @property {Object} [transaction] - Transaction/session object
 */

/**
 * @typedef {Object} PaginationMeta
 * @property {number} page - Current page number
 * @property {number} limit - Items per page
 * @property {number} total - Total number of items
 * @property {number} totalPages - Total number of pages
 * @property {boolean} hasNext - Whether there is a next page
 * @property {boolean} hasPrev - Whether there is a previous page
 */

/**
 * @typedef {Object} PaginatedResult
 * @template T
 * @property {T[]} data - Array of documents
 * @property {PaginationMeta} pagination - Pagination metadata
 */

/**
 * @typedef {Object} UpsertManyResult
 * @property {number} inserted - Number of documents inserted
 * @property {number} updated - Number of documents updated
 * @property {number} total - Total number of documents affected
 */

/**
 * @typedef {Function} TransactionCallback
 * @template T
 * @param {BaseRepository} repository - Repository instance
 * @param {Object} session - Database session/transaction
 * @returns {Promise<T>}
 */

/**
 * Base repository class providing standard database operations
 * @template T
 */
export class BaseRepository {
  /**
   * Creates an instance of BaseRepository
   * @param {Object} config - Repository configuration
   * @param {Object} config.model - Database model/schema
   * @param {Object} [config.logger] - Logger instance (defaults to console)
   * @param {Object} [config.context] - Additional context data
   * @throws {InternalServerError} If model is not provided
   */
  constructor({ model, logger, context } = {}) {
    if (!model) throw new InternalServerError('BaseRepository requires a model')

    this.model = model
    this.logger = logger || console
    this.context = context || {}
  }

  /**
   * Creates a single document
   * @param {Partial<T>} data - Document data to create
   * @param {WriteOptions} [options={}] - Write options
   * @returns {Promise<T>} Created document
   * @example
   * const user = await repo.createOne({ name: 'John', email: 'john@example.com' })
   */
  async createOne(data, options = {}) {
    const { transaction, session } = options
    return await this.model.create(data, { session: transaction || session })
  }

  /**
   * Creates multiple documents
   * @param {Partial<T>[]} dataArray - Array of document data to create
   * @param {WriteOptions} [options={}] - Write options
   * @returns {Promise<T[]>} Array of created documents
   * @example
   * const users = await repo.createMany([
   *   { name: 'John', email: 'john@example.com' },
   *   { name: 'Jane', email: 'jane@example.com' }
   * ])
   */
  async createMany(dataArray, options = {}) {
    const { transaction, session } = options
    return await this.model.insertMany(dataArray, {
      session: transaction || session,
      rawResult: false, // Return list documents
    })
  }

  /**
   * Finds a document by its ID
   * @param {string|Object} id - Document ID
   * @param {QueryOptions} [options={}] - Query options
   * @returns {Promise<T|null>} Found document or null
   * @example
   * const user = await repo.findById('507f1f77bcf86cd799439011', {
   *   select: ['name', 'email'],
   *   populate: 'profile'
   * })
   */
  async findById(id, options = {}) {
    const { select, populate, transaction } = options
    let query = this.model.findById(id).session(transaction || null)

    if (select) query = query.select(select)
    if (populate) query = query.populate(populate)

    return await query.exec()
  }

  /**
   * Finds multiple documents by their IDs
   * @param {Array<string|Object>} ids - Array of document IDs
   * @param {QueryOptions} [options={}] - Query options
   * @returns {Promise<T[]>} Array of found documents
   * @example
   * const users = await repo.findByIds(['id1', 'id2'], { sort: { name: 1 } })
   */
  async findByIds(ids, options = {}) {
    const { select, populate, sort, transaction } = options
    let query = this.model
      .find({ _id: { $in: ids } })
      .session(transaction || null)

    if (select) query = query.select(select)
    if (populate) query = query.populate(populate)
    if (sort) query = query.sort(sort)

    return await query.exec()
  }

  /**
   * Finds a single document matching the filter
   * @param {Object} [filter={}] - Query filter
   * @param {QueryOptions} [options={}] - Query options
   * @returns {Promise<T|null>} Found document or null
   * @example
   * const user = await repo.findOne({ email: 'john@example.com' })
   */
  async findOne(filter = {}, options = {}) {
    const { select, populate, sort, transaction } = options
    let query = this.model.findOne(filter).session(transaction || null)

    if (select) query = query.select(select)
    if (populate) query = query.populate(populate)
    if (sort) query = query.sort(sort)

    return await query.exec()
  }

  /**
   * Finds multiple documents matching the filter
   * @param {Object} [filter={}] - Query filter
   * @param {QueryOptions} [options={}] - Query options
   * @returns {Promise<T[]>} Array of found documents
   * @example
   * const activeUsers = await repo.findMany(
   *   { status: 'active' },
   *   { sort: { createdAt: -1 }, limit: 10 }
   * )
   */
  async findMany(filter = {}, options = {}) {
    const { select, populate, sort, skip, limit, transaction } = options
    let query = this.model.find(filter).session(transaction || null)

    if (select) query = query.select(select)
    if (populate) query = query.populate(populate)
    if (sort) query = query.sort(sort)
    if (skip) query = query.skip(skip)
    if (limit) query = query.limit(limit)

    return await query.exec()
  }

  /**
   * Finds the first document matching the filter
   * @param {Object} [filter={}] - Query filter
   * @param {QueryOptions} [options={}] - Query options
   * @returns {Promise<T|null>} First found document or null
   * @example
   * const latestUser = await repo.findFirst({}, { sort: { createdAt: -1 } })
   */
  async findFirst(filter = {}, options = {}) {
    return await this.findOne(filter, { ...options, limit: 1 })
  }

  /**
   * Finds documents with pagination support
   * @param {Object} [filter={}] - Query filter
   * @param {PaginationOptions} [pagination={}] - Pagination options
   * @returns {Promise<PaginatedResult<T>>} Paginated result with metadata
   * @example
   * const result = await repo.findWithPagination(
   *   { status: 'active' },
   *   { page: 2, limit: 20, sort: { createdAt: -1 } }
   * )
   * console.log(result.data) // Array of documents
   * console.log(result.pagination) // { page, limit, total, totalPages, hasNext, hasPrev }
   */
  async findWithPagination(filter = {}, pagination = {}) {
    const {
      page = 1,
      limit = 10,
      sort,
      select,
      populate,
      transaction,
    } = pagination
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.findMany(filter, {
        select,
        populate,
        sort,
        skip,
        limit,
        transaction,
      }),
      this.count(filter, { transaction }),
    ])

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    }
  }

  /**
   * Updates a single document matching the filter
   * @param {Object} filter - Query filter
   * @param {Partial<T>} data - Update data
   * @param {WriteOptions} [options={}] - Write options
   * @returns {Promise<T|null>} Updated document or null
   * @example
   * const user = await repo.updateOne(
   *   { email: 'john@example.com' },
   *   { status: 'inactive' }
   * )
   */
  async updateOne(filter, data, options = {}) {
    const { transaction, new: returnNew = true } = options
    return await this.model.findOneAndUpdate(filter, data, {
      new: returnNew,
      session: transaction || null,
    })
  }

  /**
   * Updates a document by its ID
   * @param {string|Object} id - Document ID
   * @param {Partial<T>} data - Update data
   * @param {WriteOptions} [options={}] - Write options
   * @returns {Promise<T|null>} Updated document or null
   * @example
   * const user = await repo.updateById('507f1f77bcf86cd799439011', { name: 'Jane' })
   */
  async updateById(id, data, options = {}) {
    const { transaction, new: returnNew = true } = options
    return await this.model.findByIdAndUpdate(id, data, {
      new: returnNew,
      session: transaction || null,
    })
  }

  /**
   * Updates multiple documents matching the filter
   * @param {Object} filter - Query filter
   * @param {Partial<T>} data - Update data
   * @param {WriteOptions} [options={}] - Write options
   * @returns {Promise<number>} Number of documents modified
   * @example
   * const count = await repo.updateMany(
   *   { status: 'pending' },
   *   { status: 'active' }
   * )
   */
  async updateMany(filter, data, options = {}) {
    const { transaction } = options
    const result = await this.model.updateMany(filter, data, {
      session: transaction || null,
    })
    return result.modifiedCount
  }

  /**
   * Updates a document or creates it if it doesn't exist
   * @param {Object} filter - Query filter
   * @param {Partial<T>} data - Document data
   * @param {WriteOptions} [options={}] - Write options
   * @returns {Promise<T>} Upserted document
   * @example
   * const user = await repo.upsertOne(
   *   { email: 'john@example.com' },
   *   { email: 'john@example.com', name: 'John' }
   * )
   */
  async upsertOne(filter, data, options = {}) {
    const { transaction } = options
    return await this.model.findOneAndUpdate(filter, data, {
      upsert: true,
      new: true,
      session: transaction || null,
    })
  }

  /**
   * Updates a document by ID or creates it if it doesn't exist
   * @param {string|Object} id - Document ID
   * @param {Partial<T>} data - Document data
   * @param {WriteOptions} [options={}] - Write options
   * @returns {Promise<T>} Upserted document
   * @example
   * const user = await repo.upsertById('507f1f77bcf86cd799439011', { name: 'John' })
   */
  async upsertById(id, data, options = {}) {
    return await this.upsertOne({ _id: id }, data, options)
  }

  /**
   * Bulk upserts multiple documents
   * @param {Partial<T>[]} dataArray - Array of document data
   * @param {UpsertOptions} [options={}] - Upsert options
   * @returns {Promise<UpsertManyResult>} Result summary
   * @example
   * const result = await repo.upsertMany([
   *   { _id: 'id1', name: 'John' },
   *   { _id: 'id2', name: 'Jane' }
   * ])
   * console.log(result) // { inserted: 1, updated: 1, total: 2 }
   */
  async upsertMany(dataArray, options = {}) {
    const { transaction, uniqueField = '_id' } = options
    const bulkOps = dataArray.map(data => ({
      updateOne: {
        filter: { [uniqueField]: data[uniqueField] },
        update: { $set: data },
        upsert: true,
      },
    }))

    const result = await this.model.bulkWrite(bulkOps, {
      session: transaction || null,
    })
    return {
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      total: result.upsertedCount + result.modifiedCount,
    }
  }

  /**
   * Deletes a single document matching the filter
   * @param {Object} filter - Query filter
   * @param {WriteOptions} [options={}] - Write options
   * @returns {Promise<boolean>} True if document was deleted
   * @example
   * const deleted = await repo.deleteOne({ email: 'john@example.com' })
   */
  async deleteOne(filter, options = {}) {
    const { transaction } = options
    const result = await this.model.deleteOne(filter, {
      session: transaction || null,
    })
    return result.deletedCount > 0
  }

  /**
   * Deletes a document by its ID
   * @param {string|Object} id - Document ID
   * @param {WriteOptions} [options={}] - Write options
   * @returns {Promise<boolean>} True if document was deleted
   * @example
   * const deleted = await repo.deleteById('507f1f77bcf86cd799439011')
   */
  async deleteById(id, options = {}) {
    const { transaction } = options
    const result = await this.model.findByIdAndDelete(id, {
      session: transaction || null,
    })
    return result !== null
  }

  /**
   * Deletes multiple documents matching the filter
   * @param {Object} filter - Query filter
   * @param {WriteOptions} [options={}] - Write options
   * @returns {Promise<number>} Number of documents deleted
   * @example
   * const count = await repo.deleteMany({ status: 'inactive' })
   */
  async deleteMany(filter, options = {}) {
    const { transaction } = options
    const result = await this.model.deleteMany(filter, {
      session: transaction || null,
    })
    return result.deletedCount
  }

  /**
   * Counts documents matching the filter
   * @param {Object} [filter={}] - Query filter
   * @param {QueryOptions} [options={}] - Query options
   * @returns {Promise<number>} Number of documents
   * @example
   * const activeCount = await repo.count({ status: 'active' })
   */
  async count(filter = {}, options = {}) {
    const { transaction } = options
    return await this.model.countDocuments(filter).session(transaction || null)
  }

  /**
   * Checks if any document exists matching the filter
   * @param {Object} [filter={}] - Query filter
   * @param {QueryOptions} [options={}] - Query options
   * @returns {Promise<boolean>} True if at least one document exists
   * @example
   * const hasActiveUsers = await repo.exists({ status: 'active' })
   */
  async exists(filter = {}, options = {}) {
    const { transaction } = options
    const count = await this.model
      .countDocuments(filter)
      .limit(1)
      .session(transaction || null)
    return count > 0
  }

  /**
   * Executes an aggregation pipeline
   * @param {Object[]} pipeline - Aggregation pipeline stages
   * @param {QueryOptions} [options={}] - Query options
   * @returns {Promise<any[]>} Aggregation results
   * @example
   * const stats = await repo.aggregate([
   *   { $match: { status: 'active' } },
   *   { $group: { _id: '$role', count: { $sum: 1 } } }
   * ])
   */
  async aggregate(pipeline, options = {}) {
    const { transaction } = options
    return await this.model.aggregate(pipeline).session(transaction || null)
  }

  /**
   * Executes operations within a transaction
   * @template R
   * @param {TransactionCallback<R>} callback - Callback function receiving repository and session
   * @returns {Promise<R>} Result from callback
   * @throws {Error} If transaction fails
   * @example
   * const result = await repo.withTransaction(async (repo, session) => {
   *   const user = await repo.createOne({ name: 'John' }, { transaction: session })
   *   await repo.updateById(otherId, { friend: user._id }, { transaction: session })
   *   return user
   * })
   */
  async withTransaction(callback) {
    const session = await this.model.db.startSession()
    session.startTransaction()

    try {
      const result = await callback(this, session)
      await session.commitTransaction()
      return result
    } catch (error) {
      await session.abortTransaction()
      this.logger.error('Transaction failed:', error)
      throw error
    } finally {
      session.endSession()
    }
  }

  /**
   * Executes a raw MongoDB database command
   * @param {Object} command - MongoDB command object
   * @param {QueryOptions} [options={}] - Query options
   * @returns {Promise<any>} Command result
   * @throws {Error} If command execution fails
   * @example
   * // Ping database
   * const result = await repo.raw({ ping: 1 })
   *
   * // Get database stats
   * const stats = await repo.raw({ dbStats: 1 })
   *
   * // Custom aggregation with explain
   * const explain = await repo.raw({
   *   explain: {
   *     find: 'users',
   *     filter: { status: 'active' }
   *   }
   * })
   */
  async raw(command, options = {}) {
    const { transaction } = options
    try {
      // Get native MongoDB Db instance
      const db = this.model.db.db

      // Execute command with optional session
      if (transaction) {
        return await db.command(command, { session: transaction })
      }
      return await db.command(command)
    } catch (error) {
      this.logger.error('Raw command failed:', {
        command,
        error: error.message,
      })
      throw error
    }
  }
}
