# Smax Branch - Architecture & Enhancements

> Comprehensive documentation of Smax-specific features and architectural patterns
>
> **Branch:** smax  
> **Base Branch:** master  
> **Author:** Dang Duc B. Dzung (David)  
> **Last Updated:** November 7, 2025  
> **Version:** 2.1-smax

---

## 📋 Table of Contents

- [1. Overview](#1-overview)
- [2. Backdoor System Architecture](#2-backdoor-system-architecture)
- [3. Kafka Integration](#3-kafka-integration)
- [4. Repository Pattern](#4-repository-pattern)
- [5. Model Helpers & Audit System](#5-model-helpers--audit-system)
- [6. Business Integration Layer](#6-business-integration-layer)
- [7. Enhanced Response System](#7-enhanced-response-system)
- [8. Best Practices & Patterns](#8-best-practices--patterns)
- [9. Performance Considerations](#9-performance-considerations)
- [10. Migration from Master](#10-migration-from-master)

---

## 1. Overview

### 1.1. Purpose

Nhánh **Smax** extends master base với các enterprise-grade features:

- **Backdoor API System**: Batch processing với concurrency control
- **Kafka Integration**: Event-driven architecture support
- **Repository Pattern**: Database abstraction layer
- **Audit System**: Complete tracking của data changes
- **Business Integration**: External service integration patterns

### 1.2. Key Differences from Master

| Feature                  | Master Base  | Smax Branch                         |
| ------------------------ | ------------ | ----------------------------------- |
| **API Style**            | REST         | REST + Backdoor (Batch)             |
| **Messaging**            | None         | Kafka Producer/Consumer             |
| **Data Access**          | Direct ODM   | Repository Pattern + BaseRepository |
| **Audit**                | Timestamps   | Full audit trail + soft delete      |
| **Response Format**      | HttpResponse | HttpResponse + SmaxResponse         |
| **Business Integration** | None         | Biz service + caching               |

### 1.3. Tech Stack Additions

```json
{
  "messaging": "Kafka (kafkajs)",
  "concurrency": "p-limit",
  "patterns": "Repository Pattern, Factory Pattern",
  "integration": "External Business Services"
}
```

---

## 2. Backdoor System Architecture

### 2.1. Overview

**Backdoor API** là một pattern cho phép batch processing multiple operations trong single HTTP request. Đây là một enterprise pattern thường dùng trong mobile/frontend optimization.

**Key Benefits:**

- Giảm số lượng HTTP requests (N operations → 1 request)
- Concurrency control với `p-limit`
- Independent error handling per operation
- Transaction-like behavior cho batch operations

### 2.2. Core Components

#### 2.2.1. SmaxResponse Class

**Location:** `src/framework/helpers/backdoor.helper.js`

Extended response format với custom status text:

```js
class SmaxResponse extends HttpResponse {
  constructor(statusCode, data, message, metadata = {}) {
    super(statusCode, data, message, metadata)
  }

  toJSON() {
    return {
      status: this.statusCode,
      statusText: buildStatusText(this.statusCode), // SUCCESS | ERROR | BAD_USER_INPUT
      message: this.message,
      data: this.data,
      timestamp: this.timestamp,
      ...this.metadata,
    }
  }
}
```

**Response Format:**

```json
{
  "status": 200,
  "statusText": "SUCCESS",
  "message": "OK",
  "data": { ... },
  "timestamp": "2025-11-07T..."
}
```

#### 2.2.2. BackdoorError Class

Specialized error class cho backdoor operations:

```js
class BackdoorError extends BaseError {
  isBadRequest() {
    this.statusCode = HTTP_STATUS.BAD_REQUEST
    this.code = HTTP_STATUS_MESSAGE_CODE.BAD_REQUEST
    return this
  }

  toJSON() {
    return new SmaxResponse(
      this.statusCode,
      null,
      this.message,
      this.metadata
    ).toJSON()
  }
}
```

**Usage:**

```js
// Throw error with metadata
throw new BackdoorError('Invalid data', {
  metadata: {
    errors: [{ field: 'email', message: 'Invalid format' }],
  },
}).isBadRequest()
```

### 2.3. wrapBackdoor Middleware

**Location:** `src/framework/middleware/wrap-backdoor.middleware.js`

#### 2.3.1. Function Signature

```js
wrapBackdoor(backdoorFnMap, (limitConcurrent = 30))
```

**Parameters:**

- `backdoorFnMap` (Object): Map của backdoor handlers
  - Key: Method name (string)
  - Value: `{ fn: Function, validator: Joi.Schema }`
- `limitConcurrent` (number): Max concurrent executions (default: 30)

#### 2.3.2. Request Format

```js
POST /api/backdoor
Content-Type: application/json

[
  {
    "method": "getUserById",
    "methodId": "req1",  // Optional: client tracking ID
    "data": { "id": "123" }
  },
  {
    "method": "searchUsers",
    "methodId": "req2",
    "query": { "name": "John", "age": 25 }
  },
  {
    "method": "updateUser",
    "methodId": "req3",
    "data": { "id": "123", "name": "Jane" },
    "options": { "upsert": true }
  }
]
```

**Request Rules:**

- Array of operation objects
- Each operation must have `method` field
- Must have either `data` OR `query` (XOR constraint)
- Optional `options` for additional parameters
- Optional `methodId` for client-side request tracking

#### 2.3.3. Response Format

```js
{
  "status": 200,
  "statusText": "SUCCESS",
  "data": [
    {
      "method": "getUserById",
      "methodId": "req1",
      "response": {
        "status": 200,
        "statusText": "SUCCESS",
        "message": null,
        "data": { "id": "123", "name": "John" }
      }
    },
    {
      "method": "searchUsers",
      "methodId": "req2",
      "response": {
        "status": 200,
        "statusText": "SUCCESS",
        "message": null,
        "data": [{ "id": "456", "name": "John Doe" }]
      }
    },
    {
      "method": "updateUser",
      "methodId": "req3",
      "response": {
        "status": 400,
        "statusText": "BAD_USER_INPUT",
        "message": "User not found",
        "data": null
      }
    }
  ],
  "timestamp": "2025-11-07T..."
}
```

### 2.4. Implementation Example

#### 2.4.1. Define Backdoor Handlers

```js
// src/modules/user/user.backdoor.js
import { Joi } from '@/core/helpers'

import {
  BackdoorError,
  SmaxResponse,
} from '@/framework/helpers/backdoor.helper'

export const userBackdoorMap = {
  // Handler 1: Get user by ID
  getUserById: {
    validator: Joi.object({
      data: Joi.object({
        id: Joi.string().required(),
      }).required(),
    }),
    fn: async ({ data, backdoor }) => {
      const user = await User.findById(data.id)
      if (!user) {
        throw new BackdoorError('User not found').isBadRequest()
      }
      return user // Auto-wrapped to SmaxResponse
    },
  },

  // Handler 2: Search users
  searchUsers: {
    validator: Joi.object({
      query: Joi.object({
        name: Joi.string().optional(),
        age: Joi.number().optional(),
        status: Joi.string().valid('active', 'inactive').optional(),
      }).required(),
    }),
    fn: async ({ query, options }) => {
      const users = await User.find(query).limit(options?.limit || 10)

      return new SmaxResponse(200, users)
    },
  },

  // Handler 3: Create user
  createUser: {
    validator: Joi.object({
      data: Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        age: Joi.number().min(18).required(),
      }).required(),
    }),
    fn: async ({ data, backdoor }) => {
      // Access backdoor context (from auth middleware)
      const { viewer } = backdoor

      const user = await User.create({
        ...data,
        createdBy: viewer,
      })

      return new SmaxResponse(201, user, 'User created successfully')
    },
  },

  // Handler 4: Batch update users
  batchUpdateUsers: {
    validator: Joi.object({
      data: Joi.object({
        userIds: Joi.array().items(Joi.string()).required(),
        updates: Joi.object().required(),
      }).required(),
    }),
    fn: async ({ data }) => {
      const result = await User.updateMany(
        { _id: { $in: data.userIds } },
        data.updates
      )

      return {
        updated: result.modifiedCount,
        matched: result.matchedCount,
      }
    },
  },
}
```

#### 2.4.2. Register Backdoor Route

```js
// src/modules/user/user.route.js
import { Router } from 'express'

import { wrapBackdoor } from '@/framework/middleware/wrap-backdoor.middleware'

import { userBackdoorMap } from './user.backdoor'

const router = Router()

// Backdoor endpoint with 50 concurrent limit
router.post('/backdoor', wrapBackdoor(userBackdoorMap, 50))

export default router
```

### 2.5. Concurrency Control

**How p-limit Works:**

```js
const limitFn = pLimit(30) // Max 30 concurrent operations

const results = await Promise.all(
  operations.map(op =>
    limitFn(async () => {
      // Process operation with concurrency limit
      return await processOperation(op)
    })
  )
)
```

**Benefits:**

- Prevent resource exhaustion
- Controlled memory usage
- Better error isolation
- Predictable performance

**Configuration:**

```js
// Low concurrency for CPU-intensive operations
wrapBackdoor(cpuIntensiveMap, 10)

// High concurrency for I/O operations
wrapBackdoor(ioIntensiveMap, 100)

// Default for balanced workload
wrapBackdoor(standardMap) // default: 30
```

### 2.6. Error Handling Flow

```
Request Validation
  ↓
  ├─ Body structure error → 400 BadRequest (all operations fail)
  ↓
Method Existence Check
  ↓
  ├─ Unknown method → 400 BadRequest (all operations fail)
  ↓
Process Each Operation (in parallel with p-limit)
  ↓
  ├─ Per-operation validation → BackdoorError (only this operation fails)
  ├─ Handler execution error → SmaxResponse with error status
  ├─ Unhandled error → 500 Internal Server Error (for this operation)
  ↓
Aggregate Results → 200 OK with mixed success/failure results
```

**Key Principle:** One operation's failure doesn't affect others (isolated error handling)

### 2.7. Best Practices

**✅ DO:**

```js
// Return SmaxResponse for custom status/message
return new SmaxResponse(200, data, 'Custom message')

// Throw BackdoorError for user errors
throw new BackdoorError('Invalid input').isBadRequest()

// Use backdoor context from auth middleware
fn: async ({ data, backdoor }) => {
  const { viewer, biz } = backdoor
  // ...
}

// Validate per-method schema
validator: Joi.object({
  data: Joi.object({ ... }).required()
})
```

**❌ DON'T:**

```js
// Don't throw generic errors
throw new Error('Something wrong') // Use BackdoorError instead

// Don't access req directly
fn: async ({ req }) => { ... } // Use { data, query, options, backdoor }

// Don't skip validation
validator: Joi.any() // Always define proper schema

// Don't set high concurrency for CPU-bound tasks
wrapBackdoor(heavyComputeMap, 1000) // Will cause resource exhaustion
```

### 2.8. Advanced Patterns

#### 2.8.1. Transaction Support

```js
{
  fn: async ({ data, backdoor }) => {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const user = await User.create([data], { session })
      const profile = await Profile.create([{ userId: user[0]._id }], {
        session,
      })

      await session.commitTransaction()
      return { user: user[0], profile: profile[0] }
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }
}
```

#### 2.8.2. Cached Backdoor Operations

```js
{
  fn: async ({ data }) => {
    const cached = await getCache({
      model: 'user',
      alias: 'getUserById',
      queryParams: { id: data.id },
    })

    if (cached.success && cached.data) {
      return cached.data
    }

    const user = await User.findById(data.id)

    await setCache({
      model: 'user',
      alias: 'getUserById',
      queryParams: { id: data.id },
      data: user,
      expire: 300,
    })

    return user
  }
}
```

---

## 3. Kafka Integration

### 3.1. Overview

Smax branch integrates **KafkaJS** để support event-driven architecture:

- **Producer**: Publish events to Kafka topics
- **Consumer**: Subscribe và process events
- **Message Handlers**: Pluggable handler architecture

### 3.2. Architecture

```
Application
    ↓
KafkaProducerService (Singleton)
    ↓
Kafka Cluster
    ↓
KafkaConsumerService (Singleton)
    ↓
Message Handlers (Topic-based routing)
    ↓
Business Logic
```

### 3.3. Configuration

**Location:** `src/framework/integrations/kafka/kafka.config.js`

```js
// Kafka connection config
export const KAFKA_CONFIG = {
  clientId: 'smax-service',
  brokers: ['localhost:9092'], // or production brokers
  // Production: SASL authentication
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
}

// Topic definitions
export const KAFKA_TOPICS = {
  DASHBOARD_LOG: 'DASHBOARD.LOG',
  PROMOTION_COUPON_EVENT: 'PROMOTION_COUPON_EVENT',
}

// Consumer config
export const CONSUMER_CONFIG = {
  groupId: 'smax-consumer-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 1048576,
}

// Producer config
export const PRODUCER_CONFIG = {
  maxInFlightRequests: 1, // Ensure ordering
  idempotent: true, // Prevent duplicates
  transactionTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
}
```

### 3.4. Kafka Producer

**Location:** `src/framework/integrations/kafka/kafka-producer.service.js`

#### 3.4.1. Basic Usage

```js
import { kafkaProducer } from '@/framework/integrations/kafka'

// Send single message
await kafkaProducer.sendMessage('DASHBOARD.LOG', {
  action: 'user_login',
  userId: '123',
  timestamp: new Date(),
})

// Send with options
await kafkaProducer.sendMessage('DASHBOARD.LOG', data, {
  key: 'user-123', // Partition key
  headers: {
    'correlation-id': uuid(),
  },
})

// Send batch messages
await kafkaProducer.sendMessages('DASHBOARD.LOG', [
  { action: 'login', userId: '1' },
  { action: 'logout', userId: '2' },
])
```

#### 3.4.2. Integration in Services

```js
// src/modules/user/services/user.service.js
export class UserService {
  async login(credentials) {
    const user = await this.authenticate(credentials)

    // Publish login event
    await kafkaProducer.sendMessage(KAFKA_TOPICS.DASHBOARD_LOG, {
      event: 'USER_LOGIN',
      userId: user.id,
      ip: credentials.ip,
      timestamp: new Date(),
    })

    return user
  }
}
```

#### 3.4.3. Features

**Automatic Connection Management:**

```js
// Auto-connect on first message
await kafkaProducer.sendMessage(...) // Connects if not connected

// Manual connect (optional)
await kafkaProducer.connect()

// Graceful disconnect
await kafkaProducer.disconnect()
```

**Connection Singleton Pattern:**

```js
class KafkaProducerService {
  async connect() {
    if (this.isConnected) return // Already connected
    if (this.connectionPromise) return this.connectionPromise // Wait for pending

    this.connectionPromise = this._doConnect()
    return this.connectionPromise
  }
}
```

### 3.5. Kafka Consumer

**Location:** `src/framework/integrations/kafka/kafka-consumer.service.js`

#### 3.5.1. Message Handler Architecture

```js
// Define message handler
// src/framework/integrations/kafka/message-handlers/dashboard-log.handler.js
export class DashboardLogHandler {
  async handle(message, context) {
    const { topic, partition, offset } = context
    const data = JSON.parse(message.value.toString())

    logger.info('Processing dashboard log', { data, offset })

    // Business logic
    await DashboardLog.create({
      ...data,
      processedAt: new Date()
    })
  }
}

// Register handler
// src/framework/integrations/kafka/kafka-consumer.service.js
initializeMessageHandlers() {
  return {
    [KAFKA_TOPICS.DASHBOARD_LOG]: new DashboardLogHandler(),
    [KAFKA_TOPICS.PROMOTION_COUPON_EVENT]: new PromotionHandler()
  }
}
```

#### 3.5.2. Start Consumer

```js
// src/apps/queue.js
import { kafkaConsumer } from '@/framework/integrations/kafka'

// Start consumer
await kafkaConsumer.start()
// Internally: connect() → subscribe() → startConsuming()

// Stop consumer (graceful shutdown)
await kafkaConsumer.stop()
```

#### 3.5.3. Error Handling

**Built-in Error Handler:**

```js
async processMessage(topic, partition, message, heartbeat, pause) {
  try {
    await heartbeat() // Keep consumer alive

    const handler = this.messageHandlers[topic]
    await handler.handle(message, context)

    await heartbeat() // Confirm processing
  } catch (error) {
    await this.handleProcessingError(error, context, pause)
  }
}

async handleProcessingError(error, context, pause) {
  logger.error('Message processing failed', { error, context })

  // Pause consumer on critical errors
  if (error.message.includes('Database connection')) {
    pause()
    setTimeout(() => {
      logger.info('Resuming consumer')
    }, 30000) // Resume after 30s
  }
}
```

**Dead Letter Queue Pattern (Future Enhancement):**

```js
// TODO: Implement DLQ
async handleProcessingError(error, context, pause) {
  if (retriesExceeded) {
    await kafkaProducer.sendMessage('DEAD_LETTER_QUEUE', {
      originalTopic: context.topic,
      originalMessage: message,
      error: error.message,
      timestamp: new Date()
    })
  }
}
```

### 3.6. Best Practices

**✅ DO:**

```js
// Use topic constants
await kafkaProducer.sendMessage(KAFKA_TOPICS.DASHBOARD_LOG, data)

// Serialize objects to JSON
await kafkaProducer.sendMessage(topic, JSON.stringify(data))

// Include correlation ID in headers
await kafkaProducer.sendMessage(topic, data, {
  headers: { 'correlation-id': req.headers['x-request-id'] }
})

// Implement heartbeat in long-running handlers
async handle(message, context) {
  await someOperation()
  await heartbeat() // Keep consumer alive
  await anotherOperation()
}

// Handle errors gracefully
async handle(message) {
  try {
    await processMessage(message)
  } catch (error) {
    logger.error('Handler error', { error })
    // Don't throw - let consumer continue
  }
}
```

**❌ DON'T:**

```js
// Don't send sensitive data without encryption
await kafkaProducer.sendMessage(topic, { password: user.password })

// Don't forget to disconnect on shutdown
process.on('SIGTERM', async () => {
  await kafkaProducer.disconnect()
  await kafkaConsumer.stop()
})

// Don't block consumer with synchronous operations
async handle(message) {
  const result = syncHeavyOperation() // ❌ Blocks event loop
  await asyncHeavyOperation()         // ✅ Non-blocking
}

// Don't create multiple producer/consumer instances
const producer = new KafkaProducerService() // ❌
import { kafkaProducer } from '...'          // ✅ Use singleton
```

---

## 4. Repository Pattern

### 4.1. Overview

**BaseRepository** provides a complete data access layer abstraction với:

- Standard CRUD operations
- Transaction support
- Pagination helpers
- Aggregation support
- Type-safe operations

### 4.2. BaseRepository Class

**Location:** `src/framework/base/repository.base.js`

#### 4.2.1. Constructor

```js
class BaseRepository {
  constructor({ model, logger, context } = {}) {
    this.model = model // Mongoose model
    this.logger = logger // Logger instance
    this.context = context // Additional context
  }
}
```

### 4.3. Core Operations

#### 4.3.1. Create Operations

```js
// Create single document
const user = await userRepo.createOne({
  name: 'John',
  email: 'john@example.com'
})

// Create multiple documents
const users = await userRepo.createMany([
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' }
])

// With transaction
const user = await userRepo.createOne(data, {
  transaction: session
})
```

#### 4.3.2. Read Operations

```js
// Find by ID
const user = await userRepo.findById('507f1f77bcf86cd799439011', {
  select: ['name', 'email'], // Field projection
  populate: 'profile'          // Relation populate
})

// Find one by filter
const user = await userRepo.findOne(
  { email: 'john@example.com' },
  { sort: { createdAt: -1 } }
)

// Find multiple
const users = await userRepo.findMany(
  { status: 'active' },
  {
    sort: { createdAt: -1 },
    skip: 10,
    limit: 10
  }
)

// Find with pagination
const result = await userRepo.findWithPagination(
  { status: 'active' },
  {
    page: 2,
    limit: 20,
    sort: { createdAt: -1 },
    select: ['name', 'email'],
    populate: 'profile'
  }
)
// Returns: { data: [...], pagination: { page, limit, total, totalPages, hasNext, hasPrev } }

// Count documents
const count = await userRepo.count({ status: 'active' })

// Check existence
const exists = await userRepo.exists({ email: 'john@example.com' })
```

#### 4.3.3. Update Operations

```js
// Update one by filter
const user = await userRepo.updateOne(
  { email: 'john@example.com' },
  { status: 'inactive' }
)

// Update by ID
const user = await userRepo.updateById(
  '507f1f77bcf86cd799439011',
  { name: 'Jane' }
)

// Update multiple
const modifiedCount = await userRepo.updateMany(
  { status: 'pending' },
  { status: 'active' }
)

// Upsert (update or create)
const user = await userRepo.upsertOne(
  { email: 'john@example.com' },
  { email: 'john@example.com', name: 'John' }
)

// Batch upsert
const result = await userRepo.upsertMany([
  { _id: 'id1', name: 'John' },
  { _id: 'id2', name: 'Jane' }
])
// Returns: { inserted: 1, updated: 1, total: 2 }
```

#### 4.3.4. Delete Operations

```js
// Delete one
const deleted = await userRepo.deleteOne({ email: 'john@example.com' })
// Returns: true if deleted

// Delete by ID
const deleted = await userRepo.deleteById('507f1f77bcf86cd799439011')

// Delete multiple
const deletedCount = await userRepo.deleteMany({ status: 'inactive' })
```

### 4.4. Advanced Features

#### 4.4.1. Transaction Support

```js
// Method 1: Using withTransaction helper
const result = await userRepo.withTransaction(async (repo, session) => {
  const user = await repo.createOne(userData, { transaction: session })
  const profile = await profileRepo.createOne(
    { userId: user._id },
    { transaction: session }
  )
  return { user, profile }
})
// Auto-commit on success, auto-rollback on error

// Method 2: Manual transaction
const session = await mongoose.startSession()
session.startTransaction()

try {
  const user = await userRepo.createOne(data, { transaction: session })
  const profile = await profileRepo.createOne(
    { userId: user._id },
    { transaction: session }
  )

  await session.commitTransaction()
} catch (error) {
  await session.abortTransaction()
  throw error
} finally {
  session.endSession()
}
```

#### 4.4.2. Aggregation

```js
const stats = await userRepo.aggregate([
  { $match: { status: 'active' } },
  {
    $group: {
      _id: '$role',
      count: { $sum: 1 },
      avgAge: { $avg: '$age' },
    },
  },
  { $sort: { count: -1 } },
])
```

#### 4.4.3. Raw Database Commands

```js
// Ping database
const result = await userRepo.raw({ ping: 1 })

// Get database stats
const stats = await userRepo.raw({ dbStats: 1 })

// Explain query plan
const explain = await userRepo.raw({
  explain: {
    find: 'users',
    filter: { status: 'active' },
  },
})
```

### 4.5. Implementation Example

```js
// src/modules/user/repositories/user.repository.js
import logger from '@/core/helpers/logger.helper'

import { BaseRepository } from '@/framework/base/repository.base'

import { User } from '../models/user.model'

class UserRepository extends BaseRepository {
  constructor() {
    super({
      model: User,
      logger,
      context: { service: 'user' },
    })
  }

  // Custom method beyond BaseRepository
  async findActiveUsers(options = {}) {
    return this.findMany({ status: 'active', isDeleted: false }, options)
  }

  async findByEmail(email, options = {}) {
    return this.findOne({ email }, options)
  }

  async softDelete(id, deletedBy) {
    return this.updateById(id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    })
  }
}

export const userRepository = new UserRepository()
```

### 4.6. Best Practices

**✅ DO:**

```js
// Extend BaseRepository for custom methods
class UserRepository extends BaseRepository {
  async findActiveAdmins() {
    return this.findMany({ role: 'admin', status: 'active' })
  }
}

// Use transactions for multi-document operations
await userRepo.withTransaction(async (repo, session) => {
  await repo.createOne(data1, { transaction: session })
  await repo.createOne(data2, { transaction: session })
})

// Project only needed fields
const users = await userRepo.findMany(filter, {
  select: ['name', 'email'], // Don't fetch unnecessary data
})

// Use pagination for large datasets
const result = await userRepo.findWithPagination(filter, {
  page: 1,
  limit: 20,
})
```

**❌ DON'T:**

```js
// Don't bypass repository
const user = await User.findById(id) // ❌
const user = await userRepo.findById(id) // ✅

// Don't forget transaction on related operations
await userRepo.createOne(user)
await profileRepo.createOne(profile) // ❌ Not in same transaction

// Don't fetch all records without limit
const users = await userRepo.findMany({}) // ❌ Might return millions
const users = await userRepo.findMany({}, { limit: 100 }) // ✅

// Don't ignore errors in withTransaction
await repo.withTransaction(async () => {
  try {
    await operation()
  } catch (e) {
    // ❌ Swallowing error - transaction won't rollback
  }
})
```

---

## 5. Model Helpers & Audit System

### 5.1. Overview

**Location:** `src/framework/helpers/model.helper.js`

Provides standardized schemas và utilities cho:

- Audit trail (createdBy, updatedBy)
- Soft delete pattern
- System metadata tracking
- Author extraction helpers

### 5.2. Schema Fields

#### 5.2.1. Common Schema Fields

```js
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
  timestamps: true, // Auto createdAt, updatedAt
}
```

#### 5.2.2. Soft Delete Fields

```js
export const softDeleteSchemaField = {
  deletedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },

  deletedBy: {
    id: { type: SchemaTypes.ObjectId, default: null },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
  },
}
```

### 5.3. Model Schema Example

```js
// src/modules/user/models/user.model.js
import mongoose from 'mongoose'

import {
  commonSchemaField,
  commonSchemaOption,
  softDeleteSchemaField,
} from '@/framework/helpers/model.helper'

const UserSchema = new mongoose.Schema(
  {
    // Business fields
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    // Common audit fields
    ...commonSchemaField,

    // Soft delete support
    ...softDeleteSchemaField,
  },
  commonSchemaOption
)

export const User = mongoose.model('User', UserSchema)
```

### 5.4. Audit Data Builders

#### 5.4.1. Build Audit Data

```js
import { buildAuditData } from '@/framework/helpers/model.helper'

// In create operation
const user = await User.create({
  name: 'John',
  email: 'john@example.com',
  ...buildAuditData(req.viewer, { created: true, updated: false })
})
// Result: { createdBy: { id, name, email }, ... }

// In update operation
const user = await User.findByIdAndUpdate(id, {
  name: 'Jane',
  ...buildAuditData(req.viewer, { created: false, updated: true })
})
// Result: { updatedBy: { id, name, email }, ... }

// Both created and updated
const user = await User.create({
  ...data,
  ...buildAuditData(req.viewer, { created: true, updated: true })
})
```

#### 5.4.2. Get Author Helper

```js
import { getAuthor } from '@/framework/helpers/model.helper'

// Extract author info from viewer
const author = getAuthor(req.viewer)
// Returns: { id: ObjectId, name: string, email: string } or null

// Usage
const post = await Post.create({
  title: 'Hello',
  createdBy: getAuthor(req.viewer),
})
```

### 5.5. System Metadata Tracking

#### 5.5.1. SYS_CREATED_FROM Constants

```js
export const SYS_CREATED_FROM = {
  PRIVATE_API: 'private-api',
  BACKDOOR: 'backdoor',
  QUEUE_PROCESS: 'queue-process',
  ADMIN_PANEL: 'admin-panel',
  MIGRATION: 'migration',
}
```

#### 5.5.2. Build System Metadata

```js
import {
  buildMetadata,
  buildSysCreatedFrom,
  SYS_CREATED_FROM
} from '@/framework/helpers/model.helper'

// In API endpoint
const user = await User.create({
  ...data,
  _metadata: buildMetadata({
    correlationId: req.headers['x-request-id'],
    sysCreatedFrom: buildSysCreatedFrom({
      serviceName: 'user-service',
      context: SYS_CREATED_FROM.PRIVATE_API
    })
  })
})
// _metadata: { _correlationId: '...', _sysCreatedFrom: 'user-service.private-api' }

// In backdoor
const user = await User.create({
  ...data,
  _metadata: buildMetadata({
    sysCreatedFrom: buildSysCreatedFrom({
      serviceName: 'user-service',
      context: SYS_CREATED_FROM.BACKDOOR
    })
  })
})

// In queue processor
const user = await User.create({
  ...data,
  _metadata: buildMetadata({
    correlationId: message.headers['correlation-id'],
    sysCreatedFrom: buildSysCreatedFrom({
      serviceName: 'user-service',
      context: SYS_CREATED_FROM.QUEUE_PROCESS
    })
  })
})
```

### 5.6. Soft Delete Pattern

```js
// Soft delete implementation
class UserRepository extends BaseRepository {
  async softDelete(id, viewer) {
    return this.updateById(id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: getAuthor(viewer),
    })
  }

  async restore(id) {
    return this.updateById(id, {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    })
  }

  // Override findMany to exclude deleted by default
  async findMany(filter = {}, options = {}) {
    const enhancedFilter = {
      ...filter,
      isDeleted: filter.isDeleted !== undefined ? filter.isDeleted : false,
    }
    return super.findMany(enhancedFilter, options)
  }
}

// Usage
await userRepo.softDelete(userId, req.viewer)
// User is marked as deleted but data retained

await userRepo.restore(userId)
// User is restored

// Find only non-deleted
const users = await userRepo.findMany({ status: 'active' })
// Automatically filters isDeleted: false

// Find including deleted
const allUsers = await userRepo.findMany({ isDeleted: undefined })
```

### 5.7. Document Standardization

```js
import { standardizeDocumentWithFields } from '@/framework/helpers/model.helper'

// Standardize document for API response
const standardUser = standardizeDocumentWithFields(user, [
  'name',
  'email',
  'role',
])

// Result includes:
// - Exposed fields: name, email, role
// - Audit fields: createdBy, updatedBy, createdAt, updatedAt
// - Soft delete fields: deletedAt, isDeleted, deletedBy
// - Standard fields: id (from _id), bizId

// Usage in controller
router.get(
  '/:id',
  wrapController(async req => {
    const user = await userRepo.findById(req.params.id)
    return standardizeDocumentWithFields(user, ['name', 'email', 'role'])
  })
)
```

### 5.8. Best Practices

**✅ DO:**

```js
// Always include audit fields in schema
const schema = new mongoose.Schema(
  {
    ...yourFields,
    ...commonSchemaField,
    ...softDeleteSchemaField,
  },
  commonSchemaOption
)

// Track who created/updated
await User.create({
  ...data,
  ...buildAuditData(req.viewer, { created: true }),
})

// Use soft delete for important data
await userRepo.softDelete(id, req.viewer)

// Track correlation ID for debugging
_metadata: buildMetadata({
  correlationId: req.headers['x-request-id'],
  sysCreatedFrom: '...',
})
```

**❌ DON'T:**

```js
// Don't skip audit tracking
await User.create(data) // ❌ No createdBy tracking

// Don't hard delete important records
await userRepo.deleteById(id) // ❌ Data lost forever
await userRepo.softDelete(id, viewer) // ✅ Retains data

// Don't forget to filter deleted records
const users = await User.find({}) // ❌ Includes deleted
const users = await User.find({ isDeleted: false }) // ✅
```

---

## 6. Business Integration Layer

### 6.1. Overview

**Location:** `src/framework/integrations/biz.integration.js`

Provides integration với external business services:

- Business authentication
- Service-to-service calls
- Response caching
- Error transformation

### 6.2. Core Functions

#### 6.2.1. getBiz Function

```js
/**
 * Get business by alias with caching
 * @param {string} bizAlias - Business alias
 * @param {string} token - JWT token
 * @returns {Promise<BizAuthMiddlewareResponse>}
 */
export const getBiz = async(bizAlias, token)
```

**Features:**

- JWT token parsing
- Cache-first strategy (2 minutes TTL)
- Error transformation (404 → NotFoundError, 401 → UnauthorizedError)

**Usage:**

```js
import { getBiz } from '@/framework/integrations/biz.integration'

// In auth middleware
const bizData = await getBiz('my-business', req.headers.authorization)
// Returns: { status, statusText, data: { biz, viewer, setting } }

req.biz = bizData.data.biz
req.viewer = bizData.data.viewer
req.setting = bizData.data.setting
```

**Caching Strategy:**

```js
// Cache key format
{
  model: 'biz',
  alias: 'my-business',
  queryParams: { authorization: viewerId }
}

// Cache hit: Return cached data
// Cache miss: Fetch from API + cache for 2 minutes
```

#### 6.2.2. Backdoor Authentication Functions

**Smax App Backdoor:**

```js
import { getSmaxAppBackdoorData } from '@/framework/integrations/biz.integration'

// Verify backdoor token with Smax App service
const backdoorData = await getSmaxAppBackdoorData(backdoorToken)
// Returns: viewer, biz, permissions, etc.
```

**Smax F&B Backdoor:**

```js
import { getSmaxFnbBackdoorData } from '@/framework/integrations/biz.integration'

// Verify backdoor token with Smax F&B service (batch backdoor style)
const backdoorData = await getSmaxFnbBackdoorData(backdoorToken)
```

### 6.3. Integration in Middleware

```js
// src/framework/middleware/auth.middleware.js
import {
  getBiz,
  getSmaxAppBackdoorData,
} from '@/framework/integrations/biz.integration'

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization
    const backdoorToken = req.headers['x-backdoor-token']

    if (backdoorToken) {
      // Backdoor authentication
      const backdoorData = await getSmaxAppBackdoorData(backdoorToken)
      req.backdoor = backdoorData
      req.viewer = backdoorData.viewer
      req.biz = backdoorData.biz
    } else if (token) {
      // Normal authentication
      const bizAlias = req.params.bizAlias || req.query.bizAlias
      const bizData = await getBiz(bizAlias, token)

      req.biz = bizData.data.biz
      req.viewer = bizData.data.viewer
      req.setting = bizData.data.setting
    } else {
      throw new UnauthorizedError()
    }

    next()
  } catch (error) {
    next(error)
  }
}
```

### 6.4. Best Practices

**✅ DO:**

```js
// Cache external service calls
const bizData = await getBiz(alias, token) // Auto-cached

// Transform errors appropriately
catch (error) {
  if (isAxiosError(error)) {
    if (error.status === 404) throw new NotFoundError()
    if (error.status === 401) throw new UnauthorizedError()
  }
}

// Pass correlation ID
const response = await $get('/endpoint', {
  headers: {
    'x-correlation-id': req.headers['x-request-id']
  }
})
```

**❌ DON'T:**

```js
// Don't skip caching for expensive calls
const biz = await $get(`/bizs/${alias}`) // ❌ No cache

// Don't expose raw external errors
catch (error) {
  throw error // ❌ Exposes internal details
}

// Don't forget timeout configuration
const response = await $get('/slow-service') // ❌ Might hang
const response = await $get('/slow-service', { timeout: 5000 }) // ✅
```

---

## 7. Enhanced Response System

### 7.1. Response Format Comparison

**Master (HttpResponse):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "message": "OK",
  "meta": { ... },
  "timestamp": "2025-11-07T..."
}
```

**Smax (SmaxResponse):**

```json
{
  "status": 200,
  "statusText": "SUCCESS",
  "message": "OK",
  "data": { ... },
  "timestamp": "2025-11-07T...",
  ...metadata
}
```

### 7.2. Status Text Building

```js
export const buildStatusText = statusCode => {
  if (statusCode === HTTP_STATUS.BAD_REQUEST) return 'BAD_USER_INPUT'
  return statusCode >= 200 && statusCode < 300 ? 'SUCCESS' : 'ERROR'
}

// Examples:
// 200 → SUCCESS
// 201 → SUCCESS
// 400 → BAD_USER_INPUT
// 500 → ERROR
```

### 7.3. Usage Guidelines

**When to use HttpResponse:**

- Standard REST endpoints
- Master branch compatibility
- Simple success/error cases

**When to use SmaxResponse:**

- Backdoor operations
- External service responses
- Custom status text requirements
- Metadata-heavy responses

---

## 8. Best Practices & Patterns

### 8.1. Error Handling

```js
// Use specific error classes
throw new NotFoundError('User', userId)
throw new BackdoorError('Invalid data').isBadRequest()

// Chain errors for context
try {
  await externalService.call()
} catch (err) {
  throw new ServiceUnavailableError('External service', err)
}
```

### 8.2. Transaction Management

```js
// Use withTransaction helper
await userRepo.withTransaction(async (repo, session) => {
  const user = await repo.createOne(data, { transaction: session })
  await profileRepo.createOne({ userId: user._id }, { transaction: session })
  return user
})
```

### 8.3. Caching Strategy

```js
// Cache external service calls
const cache = await getCache({ model, alias, queryParams })
if (cache.success && cache.data) return cache.data

const data = await fetchFromService()
await setCache({ model, alias, queryParams, data, expire: 300 })
```

### 8.4. Backdoor Design

```js
// Keep handlers focused
{
  fn: async ({ data }) => {
    // Single responsibility
    return await service.operation(data)
  }
}

// Use proper validation
validator: Joi.object({
  data: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().min(3).required(),
  }).required(),
})
```

---

## 9. Performance Considerations

### 9.1. Backdoor Concurrency

- Set appropriate `limitConcurrent` based on operation type
- CPU-intensive: 5-10
- I/O-intensive: 30-100
- Mixed: 30 (default)

### 9.2. Kafka Optimization

- Batch messages when possible (use `sendMessages`)
- Configure appropriate consumer `maxBytesPerPartition`
- Implement message handler timeouts
- Use compression for large messages

### 9.3. Repository Performance

- Always use field projection (`select`)
- Implement pagination for large datasets
- Create appropriate database indexes
- Use aggregation for complex queries

### 9.4. Caching Best Practices

- Cache expensive operations (external calls, complex queries)
- Set appropriate TTL (1-5 minutes for dynamic data)
- Use query param normalization for consistent cache keys
- Implement cache warming for hot paths

---

## 10. Migration from Master

### 10.1. Step-by-Step Migration

**1. Install new dependencies:**

```bash
pnpm add kafkajs p-limit
```

**2. Update imports:**

```js
// Add backdoor imports
// Add repository imports
import { BaseRepository } from '@/framework/base/repository.base'
import {
  BackdoorError,
  SmaxResponse,
} from '@/framework/helpers/backdoor.helper'
// Add model helpers
import {
  buildAuditData,
  commonSchemaField,
} from '@/framework/helpers/model.helper'
// Add Kafka imports
import { kafkaConsumer, kafkaProducer } from '@/framework/integrations/kafka'
import { wrapBackdoor } from '@/framework/middleware/wrap-backdoor.middleware'
```

**3. Migrate data access to repositories:**

```js
// Before (Master)
const user = await User.findById(id)
const users = await User.find({ status: 'active' })

// After (Smax)
const user = await userRepo.findById(id)
const users = await userRepo.findMany({ status: 'active' })
```

**4. Update schemas with audit fields:**

```js
// Before
const UserSchema = new mongoose.Schema({
  name: String,
  email: String
}, { timestamps: true })

// After
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  ...commonSchemaField,
  ...softDeleteSchemaField
}, commonSchemaOption)
```

**5. Implement backdoor endpoints:**

```js
// Create backdoor map
const userBackdoorMap = {
  getUser: { fn: async ({ data }) => { ... }, validator: ... },
  createUser: { fn: async ({ data }) => { ... }, validator: ... }
}

// Register endpoint
router.post('/backdoor', wrapBackdoor(userBackdoorMap, 50))
```

### 10.2. Breaking Changes

**None** - Smax branch is fully backward compatible with master. All master features continue to work as expected.

### 10.3. Optional Migrations

- Backdoor API: Opt-in feature, doesn't affect existing REST endpoints
- Kafka: Opt-in feature, requires configuration
- Repository Pattern: Can be adopted gradually
- Audit Fields: Can be added to new models only

---

**End of Smax Branch Documentation**

> 💡 **Note:** This is a living document. As new features are added to Smax branch, this documentation will be updated accordingly.
