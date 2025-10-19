# Architecture Overview

> Tài liệu tổng hợp kiến trúc và patterns của ExpressJS CRUD project
>
> **Author:** Dang Duc B. Dzung (David)  
> **Last Updated:** October 19, 2025

---

## 📋 Table of Contents

- [1. Tổng quan dự án](#1-tổng-quan-dự-án)
- [2. Kiến trúc Layered Architecture](#2-kiến-trúc-layered-architecture)
- [3. Core Layer](#3-core-layer)
- [4. Framework Layer](#4-framework-layer)
- [5. Module Architecture](#5-module-architecture)
- [6. Configuration System](#6-configuration-system)
- [7. Error Handling Strategy](#7-error-handling-strategy)
- [8. Request Context Management](#8-request-context-management)
- [9. Validation & Security](#9-validation--security)
- [10. Build & Development Workflow](#10-build--development-workflow)
- [11. Best Practices & Patterns](#11-best-practices--patterns)

---

## 1. Tổng quan dự án

### 1.1. Mục đích

Project này là một **ExpressJS boilerplate** với kiến trúc Layered Architecture, tách biệt rõ ràng giữa:

- **Core Layer**: Cross-cutting concerns (logging, validation, error handling)
- **Framework Layer**: Express-specific integration (middleware, routing)
- **Modules Layer**: Business logic (chưa implement, sẵn sàng mở rộng)

### 1.2. Tech Stack

```json
{
  "runtime": "Node.js 18+",
  "framework": "Express 5.x",
  "transpiler": "Babel 7.x",
  "validator": "Joi 18.x",
  "logger": "Winston 3.x",
  "testing": "Jest 29.x",
  "linter": "ESLint 9.x",
  "formatter": "Prettier 3.x"
}
```

### 1.3. Project Structure

```
src/
├── apps/                     # Application entry points
│   └── main.js              # Main app entry (orchestrator)
├── configs/                  # Configuration layer
│   ├── env-schema.js        # Environment validation (Joi)
│   └── app.config.js        # Application config (merged by env)
├── core/                     # Core cross-cutting concerns
│   ├── constants/           # Constants (HTTP status, log levels)
│   ├── helpers/             # Helpers (error, logger, validator, request-context, http-response)
│   ├── utils/               # Utilities (common, security, type-check)
│   └── Throwable.js         # Interface for error/response objects
├── framework/               # Express-specific layer
│   ├── express.loader.js   # Express app factory
│   ├── shutdown.helper.js  # Graceful shutdown system
│   ├── helpers/             # Framework helpers
│   │   ├── api.helper.js   # API utilities (PaginatedResponse, query params)
│   │   └── mongodb.helper.js # MongoDB utilities (ObjectId helpers)
│   └── middleware/         # Express middleware
│       ├── request-context.middleware.js
│       ├── request-logger.middleware.js
│       ├── request-validator.middleware.js
│       ├── add-response-time.middleware.js
│       ├── not-found.middleware.js
│       ├── error-handler.middleware.js
│       └── wrap-controller.middleware.js
└── modules/                 # Business modules
    ├── main.route.js        # Main routes registry
    └── _post_/              # Post module (example)
        ├── mock-post.js     # Mock data
        ├── post.route.js    # Routes
        ├── services/        # Business logic
        │   └── post.service.js
        ├── usecases/        # Use cases (orchestration)
        │   └── post-crud.usecase.js
        └── validators/      # Validation schemas
            └── post.validator.js
```

---

## 2. Kiến trúc Layered Architecture

### 2.1. Nguyên tắc thiết kế

#### **Separation of Concerns**

- **Core Layer**: Framework-agnostic, reusable utilities
- **Framework Layer**: Express-specific integration
- **Modules Layer**: Business logic và domain models

#### **Dependency Direction**

```
Modules → Framework → Core
```

- Core **không** phụ thuộc Framework hay Modules
- Framework **chỉ** phụ thuộc Core
- Modules phụ thuộc cả Framework và Core

#### **Path Aliases**

```js
'@/core'       → './src/core'
'@/configs'    → './src/configs'
'@/constants'  → './src/core/constants'
'@/helpers'    → './src/core/helpers'
'@/utils'      → './src/core/utils'
'@/framework'  → './src/framework'
'@/modules'    → './src/modules'
```

---

## 3. Core Layer

### 3.1. Constants

#### **common.constant.js**

```js
ENVIRONMENT // development, production, test, staging
APP_NAME // main, queue, socket
API_PREFIX // 'api' - default API prefix for routes
LOG_LEVEL // debug, info, warn, error, verbose, http
TIMEOUT_CONTROLLER // DEFAULT: 10000ms, HEAVY_PROCESS: 20000ms, ENQUEUE_PROCESS: 5000ms
REQUEST_ID_KEY // 'X-Request-Id'
CURRENT_ENV // Current environment (from NODE_ENV)
```

#### **http-status.constant.js**

```js
HTTP_STATUS // { OK: 200, BAD_REQUEST: 400, ... }
HTTP_STATUS_MESSAGE // { OK: 'OK', ... }
HTTP_STATUS_MESSAGE_CODE // { OK: 'OK', ... }
HTTP_STATUS_MESSAGE_CODE_MAP // Mapping statusCode → message code
getHttpStatusMessageCode() // Helper function
```

### 3.2. Helpers

#### **error.helper.js** - Centralized Error Handling

```js
// Base Error Class
class BaseError extends Error {
  constructor(message, options)
  toJSON()              // Serialize to API response
  getErrorChain()       // Get full error chain (cause tracking)
}

// Specific Error Classes
ValidationError         // 400 - Request validation failed
NotFoundError          // 404 - Resource not found
UnauthorizedError      // 401 - Authentication required
ForbiddenError         // 403 - Access denied
ConflictError          // 409 - Resource conflict
TooManyRequestsError   // 429 - Rate limit exceeded
InternalServerError    // 500 - Programming error
ServiceUnavailableError // 503 - External dependency issue
BusinessError          // Custom business logic errors
```

**Error Classification**:

- `isOperational: true` → Expected errors (validation, not found)
- `isOperational: false` → Programming errors (bugs, null reference)

**Error Context**:

```js
throw new BaseError('Database query failed', {
  statusCode: 500,
  code: 'DB_QUERY_FAILED',
  context: { query: 'SELECT * FROM users' },
  cause: originalError, // Error chaining
  metadata: { timestamp, environment },
})
```

#### **logger.helper.js** - Production-Ready Logging

```js
// Winston-based logger with:
// - Caller tracking (file:line)
// - Request context (requestId, userId)
// - Daily rotating file transport
// - Colored console output
// - Environment-specific log levels

logger.debug('Debug message', { data })
logger.info('Info message')
logger.warn('Warning')
logger.error('Error', { error })
logger.http('HTTP request') // Auto-logged by morgan
```

**Log Levels by Environment**:
| Environment | Console Level | File Level |
|------------|---------------|------------|
| production | info | error |
| development| debug | debug |
| staging | verbose | verbose |
| test | silent | silent |

**Features**:

- Caller info tracking: `(controllers/user.js:42)`
- Request context: `[reqId=req_123 userId=456]`
- Error stack traces (non-production only)
- Daily log rotation (7 days retention)

#### **validator.helper.js** - Joi Validation

```js
import { Joi, validate } from '@/helpers/validator.helper'

// Extended Joi with:
// - Date validation support (@joi/date)
// - Default preferences (abortEarly, error labels)

const schema = Joi.object({
  email: Joi.string().email().required(),
  age: Joi.number().min(18),
})

const validated = validate(schema, rawData)
```

#### **http-response.helper.js** - Standardized Response

```js
class HttpResponse {
  constructor(statusCode, data, message, metadata)
  toJSON()  // Returns standardized format
}

// Response format:
{
  success: true,
  statusCode: 200,
  data: { ... },
  message: 'OK',
  meta: { ... },
  timestamp: '2025-10-16T...'
}
```

### 3.3. Utils

#### **security.util.js** - Prototype Pollution Protection

```js
DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype']

isDangerousKey(key) // Check if key is dangerous
deepSanitize(value, visited) // Recursively remove dangerous keys
```

**Deep Sanitization**:

- Handles nested objects/arrays
- Detects circular references
- Preserves Date, RegExp, Error objects
- Used in request validation pipeline

#### **type-check.util.js** - Type Checking Utilities

```js
isNil(value) // null or undefined
isObject(value) // object (excluding null, arrays)
isPlainObject(value) // plain object (literal or Object constructor)
isEmpty(value) // empty string/array/object
isPrimitive(value) // primitive type check
```

#### **common.util.js** - Common Utilities

```js
pick(obj, keys)              // Pick specific keys
omit(obj, keys)              // Omit specific keys
ensureObject(val, default)   // Ensure value is object
merge(target, ...sources)    // Deep merge (with security)
snooze(ms)                   // Sleep/delay promise
```

### 3.4. Throwable Interface

```js
// Interface for all error/response objects
export class Throwable {
  toJSON()  // Must implement serialization
}

// Implemented by:
// - BaseError and all error classes
// - HttpResponse
```

---

## 4. Framework Layer

### 4.1. Application Factory Pattern

**express.loader.js** - Factory function để tạo Express app với standardized middleware pipeline:

```js
import { createApp } from '@/framework/express.loader'

const app = createApp(APP_NAME.MAIN, app => {
  // Register routes here
  app.get('/health', healthCheckHandler)
  app.use('/api/users', userRoutes)
})
```

**Middleware Pipeline** (trong createApp):

```js
// Stage 1: Pre-route middleware (auto-registered)
app.use(requestContext({ ... }))           // AsyncLocalStorage context
app.use(requestLogger)                     // Morgan + Winston logging
app.use(addResponseTime)                   // X-Response-Time header
app.use(cors())                            // CORS headers
app.use(compression())                     // Gzip compression
app.use(helmet())                          // Security headers
app.use(express.json())                    // JSON body parser
app.use(express.urlencoded())              // URL-encoded parser

// Stage 2: Routes (via callback parameter)
callback(app)

// Stage 3: Error handlers (auto-registered, must be last)
app.use(notFound)                          // 404 handler
app.use(errorHandler)                      // Global error handler
```

### 4.2. Graceful Shutdown System

**shutdown.helper.js** - Production-ready graceful shutdown với cleanup task registry:

```js
import {
  registerShutdownTask,
  setupGracefulShutdown,
} from '@/framework/shutdown.helper'

// Register cleanup tasks from anywhere
registerShutdownTask(
  async () => await mongoose.disconnect(),
  'mongodb-disconnect'
)
registerShutdownTask(async () => await redisClient.quit(), 'redis-disconnect')

// Setup shutdown handler (in apps/main.js)
const server = app.listen(port)
setupGracefulShutdown(server, { timeoutMs: 10000 })
```

**Features**:

- **Signal Handling**: SIGTERM, SIGINT, SIGHUP
- **Crash Protection**: uncaughtException, unhandledRejection
- **Cleanup Registry**: Register tasks from any module
- **Timeout Protection**: Force exit after timeout (default: 10s)
- **Duplicate Prevention**: Prevent multiple shutdown attempts

**Shutdown Flow**:

```
Signal received (SIGTERM/SIGINT)
  ↓
Stop accepting new requests (server.close())
  ↓
Execute all registered cleanup tasks
  ↓
Race with timeout (10s default)
  ↓
Exit process (code 0 or 1)
```

### 4.3. Middleware Details

#### 4.3.1. request-context.middleware.js

**Purpose**: Setup AsyncLocalStorage để track request context trong suốt request lifecycle.

```js
import { requestContext } from '@/framework/middleware/request-context.middleware'

app.use(
  requestContext({
    extractUserId: req => req.user?.id,
    extractMetadata: req => ({ tenantId: req.tenant?.id }),
  })
)
```

**Context Structure**:

```js
{
  requestId: 'req_1697456789_abc123',
  method: 'POST',
  url: '/api/users',
  path: '/api/users',
  ip: '127.0.0.1',
  userAgent: 'Mozilla/5.0...',
  startTime: process.hrtime.bigint(),  // High-resolution timestamp
  userId: 123,              // From extractUserId
  tenantId: 456             // From extractMetadata
}
```

**Usage in code**:

```js
import { requestContextHelper } from '@/core/helpers/request-context.helper'

const ctx = requestContextHelper.getContext()
const requestId = requestContextHelper.getContextValue('requestId')
requestContextHelper.setContextValue('key', value)
```

#### 4.3.2. add-response-time.middleware.js

**Purpose**: Tự động thêm `X-Response-Time` header vào response.

```js
// Automatically added by express.loader
// Uses high-resolution timer for accurate measurement
```

**Implementation**:

- Hook vào `res.writeHead()` để capture timing
- Sử dụng `process.hrtime.bigint()` từ request context
- Calculate duration: `(endTime - startTime) / 1e6` ms
- Set header: `X-Response-Time: 123.4567`

**Benefits**:

- Monitor API performance
- Identify slow endpoints
- Track latency trends

#### 4.3.3. not-found.middleware.js

**Purpose**: Handle 404 errors cho routes không tồn tại.

```js
// Automatically registered last (before errorHandler)
// Catches all unmatched routes
```

**Response**:

```js
{
  name: 'NotFoundError',
  code: 'NOT_FOUND',
  message: 'Resource not found',
  statusCode: 404,
  context: { identifier: '/api/unknown' }
}
```

#### 4.3.4. request-validator.middleware.js

**Purpose**: Validate `req.params`, `req.query`, `req.body` với Joi schema và deep sanitize để prevent prototype pollution.

```js
const schema = {
  params: Joi.object({ id: Joi.string() }).unknown(true),
  query: Joi.object({ limit: Joi.number() }).unknown(true),
  body: Joi.object({
    name: Joi.string().required(),
    age: Joi.number().min(18),
  }).unknown(true),
}

app.post(
  '/users/:id',
  requestValidator(schema, { removeUnknown: true }),
  handler
)
```

**Options**:

- `removeUnknown: true` → Chỉ giữ lại fields defined trong schema
- `removeUnknown: false` → Giữ tất cả fields nhưng vẫn deep sanitize

**Pipeline**:

1. Extract `params`, `query`, `body` từ request
2. Validate với Joi schema
3. Deep sanitize để remove dangerous keys
4. Filter unknown fields (nếu `removeUnknown: true`)
5. Assign validated data back to `req` object

**Express 5 Compatibility**: Sử dụng `Object.defineProperty()` để override read-only getters.

#### 4.3.5. request-logger.middleware.js

**Purpose**: HTTP request logging với Morgan + Winston.

```js
// Morgan format:
':remote-addr :method :url :status :res[content-length] - :response-time ms [userId=:user reqId=:id]'

// Custom tokens:
morgan.token('id', () => requestContextHelper.getContextValue('requestId'))
morgan.token('user', () => requestContextHelper.getContextValue('userId'))
```

**Skip Paths**: `/healthz`, `/favicon`

**Environment Behavior**:

- **production/staging**: Log with skip paths
- **development**: Log all requests
- **test**: Silent

#### 4.3.6. wrap-controller.middleware.js

**Purpose**: Wrap async controller functions với:

- Automatic error handling
- Timeout protection
- Standardized response formatting

```js
const controllerFn = async (req, res, next) => {
  const user = await getUserById(req.params.id)
  return new HttpResponse(200, user)
  // hoặc
  return user // Auto-wrapped to HttpResponse
}

app.get('/users/:id', wrapController(controllerFn, { timeout: 10000 }))
```

**Features**:

- Automatic timeout handling (default: 10s)
- Auto-convert return value to `HttpResponse`
- Catch và forward errors to error handler
- Skip nếu response đã sent

**Return Types**:

- `HttpResponse` → Send JSON response
- `BaseError` → Forward to error handler
- `undefined` → Send empty 200 response
- `any` → Wrap in HttpResponse(200, data)

#### 4.3.7. error-handler.middleware.js

**Purpose**: Global error handler cho tất cả errors.

```js
app.use(errorHandler)
```

**Error Handling Flow**:

1. `HttpResponse` instance → Send response
2. `BaseError` instance → Send `error.toJSON()`
3. `Error` instance → Send error details (stack in dev only)
4. Unknown error → Send generic error message

**Production Mode**:

- Hide error stack traces
- Use generic error messages
- Log full error details to file

### 4.4. Security Hardening

**Helmet.js Integration** - Automatic security headers:

```js
// Auto-enabled in express.loader
app.use(helmet())
```

**Headers set by Helmet**:

- `Content-Security-Policy`: XSS protection
- `X-DNS-Prefetch-Control`: DNS prefetch control
- `X-Frame-Options`: Clickjacking protection
- `Strict-Transport-Security`: HTTPS enforcement
- `X-Download-Options`: IE8+ download protection
- `X-Content-Type-Options`: MIME sniffing protection
- `X-Permitted-Cross-Domain-Policies`: Adobe products cross-domain
- `Referrer-Policy`: Referrer information control
- `X-XSS-Protection`: Legacy XSS filter

**CORS Configuration**:

```js
app.use(cors()) // Currently permissive
// TODO: Restrict to specific origins in production
```

**Compression**:

```js
app.use(compression()) // Gzip/Deflate compression
// Reduces bandwidth usage significantly
```

---

## 5. Module Architecture

### 5.1. Module Structure Pattern

Project sử dụng **feature-based organization** theo pattern:

```
modules/
├── main.route.js           # Central route registry
└── <module-name>/
    ├── <module>.route.js   # Routes definition
    ├── mock-<module>.js    # Mock data (for development)
    ├── services/           # Business logic layer
    │   └── <module>.service.js
    ├── usecases/           # Use case orchestration layer
    │   └── <module>-crud.usecase.js
    └── validators/         # Validation schemas
        └── <module>.validator.js
```

### 5.2. Post Module Example

#### 5.2.1. Module Overview

Post module là example implementation của CRUD operations với architecture pattern đầy đủ:

```
_post_/
├── mock-post.js            # In-memory data store
├── post.route.js           # HTTP routes
├── services/
│   └── post.service.js     # Data access layer
├── usecases/
│   └── post-crud.usecase.js # Business orchestration
└── validators/
    └── post.validator.js   # Joi validation schemas
```

#### 5.2.2. Routes Layer (post.route.js)

**Responsibilities**:

- HTTP route definitions
- Request validation setup
- Controller wrapping
- Response formatting

**Example**:

```js
import { Router } from 'express'

import { HTTP_STATUS } from '@/core/constants'
import { HttpResponse } from '@/core/helpers'

import { PaginatedResponse } from '@/framework/helpers'
import { requestValidator, wrapController } from '@/framework/middleware'

const router = Router()

// CREATE - 201 response
router.post(
  '/',
  requestValidator(createOneDto),
  wrapController(async req => {
    return new HttpResponse(
      HTTP_STATUS.CREATED,
      await postCrudUsecase.createOnePostUsecase(req.body)
    )
  })
)

// UPDATE - 200 response (auto-wrapped)
router.patch(
  '/:id',
  requestValidator(updateOneDto),
  wrapController(async req => {
    return postCrudUsecase.updateOnePostUsecase(req.params, req.body)
  })
)

// LIST - Paginated response
router.get(
  '/',
  requestValidator(getListDto),
  wrapController(async req => {
    const { list, total } = await postCrudUsecase.getListPostUsecase(req.query)
    return new PaginatedResponse(list, {
      page: req.query.page,
      limit: req.query.limit,
      total,
    })
  })
)

export default router
```

**Key Features**:

- Thin controllers (business logic in services/usecases)
- Automatic error handling via `wrapController`
- Standardized responses (`HttpResponse`, `PaginatedResponse`)
- Validation at route level

#### 5.2.3. Validators Layer (post.validator.js)

**Responsibilities**:

- Define Joi schemas for request validation
- Reuse standard query params for pagination

**Example**:

```js
import { Joi } from '@/core/helpers/validator.helper'

import { stdGetListQueryParams } from '@/framework/helpers'

export const createOneDto = {
  body: Joi.object({
    title: Joi.string().required(),
    content: Joi.string().optional(),
  }),
}

export const updateOneDto = {
  params: Joi.object({
    id: Joi.number().required(),
  }),
  body: Joi.object({
    title: Joi.string().optional(),
    content: Joi.string().optional(),
  })
    .min(1) // At least 1 field required
    .required(),
}

export const getListDto = {
  query: stdGetListQueryParams, // Reuse standard pagination schema
}
```

**Standard Query Params** (`stdGetListQueryParams`):

```js
{
  page: Joi.number().default(1).min(1).optional(),
  limit: Joi.number().max(1000).default(10).optional(),
  q: Joi.string().max(256).trim().optional(),      // search term
  sortBy: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).optional(),
  fields: Joi.array().items(Joi.string()).min(1).optional(),  // field projection
}
```

#### 5.2.4. Use Cases Layer (post-crud.usecase.js)

**Responsibilities**:

- Business logic orchestration
- Coordinate between multiple services
- Handle cross-cutting concerns (authorization, logging)

**Example**:

```js
export class PostCrudUsecase {
  constructor(postService) {
    this.postService = postService
  }

  createOnePostUsecase(dto) {
    return this.postService.createOne(dto)
  }

  async getListPostUsecase(queryDto) {
    // Early return optimization
    const total = await this.postService.getTotal(queryDto)
    if (total === 0) {
      return { list: [], total: 0 }
    }

    return {
      list: await this.postService.getList(queryDto),
      total,
    }
  }

  // ... other use cases
}

export const postCrudUsecase = new PostCrudUsecase(postService)
```

**Pattern**: Singleton instance exported for easy import

#### 5.2.5. Services Layer (post.service.js)

**Responsibilities**:

- Data access logic
- Database/storage operations
- Data transformation

**Example**:

```js
import { NotFoundError } from '@/core/helpers'
import { pick } from '@/core/utils'

import { posts } from '../mock-post'

export class PostService {
  createOne(dto) {
    const newPost = {
      ...dto,
      id: posts.length + 1,
      createdAt: new Date(),
    }
    posts.push(newPost)
    return newPost
  }

  getList(queryDto) {
    const { page, limit, sortBy, fields } = queryDto

    let result = posts

    // Sorting logic
    if (sortBy) {
      result = result.sort((a, b) => {
        const isDescending = sortBy.startsWith('-')
        const field = isDescending ? sortBy.slice(1) : sortBy
        return isDescending ? b[field] - a[field] : a[field] - b[field]
      })
    }

    // Pagination + field projection
    return result
      .slice((page - 1) * limit, page * limit)
      .map(post => (fields ? pick(post, fields) : post))
  }

  getDetail(queryDto) {
    const post = posts.find(post => post.id === queryDto.id)
    if (!post) {
      throw new NotFoundError('Post', { id: queryDto.id })
    }
    return post
  }
}

export const postService = new PostService()
```

**Features**:

- Uses `NotFoundError` for resource not found
- Supports sorting, pagination, field projection
- Mock data for rapid prototyping

#### 5.2.6. Route Registration (main.route.js)

**Central registry** cho tất cả module routes:

```js
import { Router } from 'express'

import postRoutes from './_post_/post.route'

const router = Router()

router.use('/posts', postRoutes)
// router.use('/users', userRoutes)
// router.use('/auth', authRoutes)

export default router
```

**Usage in app**:

```js
// apps/main.js
import { API_PREFIX } from '@/core/constants/common.constant'

import mainRoutes from '@/modules/main.route'

const app = createApp(APP_NAME.MAIN, app => {
  app.use(`/${API_PREFIX}`, mainRoutes)
})

// Result: /api/posts, /api/users, ...
```

### 5.3. Module Architecture Benefits

**1. Separation of Concerns**:

```
Routes → Usecases → Services
- Routes: HTTP layer (thin controllers)
- Usecases: Business orchestration
- Services: Data access
```

**2. Testability**:

- Test services independently (pure business logic)
- Mock services in usecase tests
- Mock usecases in route/integration tests

**3. Reusability**:

- Services can be reused across multiple usecases
- Usecases can be reused in different contexts (HTTP, queue, socket)

**4. Maintainability**:

- Clear boundaries between layers
- Easy to locate code (feature-based)
- Changes in one layer don't affect others

---

## 6. Application Entry Point

### 6.1. apps/main.js - Bootstrap Orchestrator

**Purpose**: Main application entry với complete lifecycle management.

**Structure**:

```js
// 1. Create Express app with factory
const app = createApp(APP_NAME.MAIN, app => {
  // Register routes
  app.post('/', requestValidator(schema), wrapController(controllerFn))
})

// 2. Start HTTP server
const server = app.listen(config.port, err => {
  if (err) {
    logger.error('Failed to start server', { err })
    process.exit(1)
  }
  logger.info('Server is running on port ' + config.port)
})

// 3. Setup graceful shutdown
setupGracefulShutdown(server)

// 4. Export server for testing
export default server
```

**Benefits**:

- **Separation of Concerns**: App creation ≠ Server lifecycle
- **Testability**: Can test app without starting server
- **Production-Ready**: Graceful shutdown built-in
- **Fail-Fast**: Startup errors exit immediately

### 6.2. Multiple Apps Pattern

**Support for multiple apps** (main, queue, socket):

```js
// apps/main.js - Main HTTP API
const mainApp = createApp(APP_NAME.MAIN, registerMainRoutes)

// apps/queue.js - Background job processor
const queueApp = createApp(APP_NAME.QUEUE, registerQueueWorkers)

// apps/socket.js - WebSocket server
const socketApp = createApp(APP_NAME.SOCKET, registerSocketHandlers)
```

**Use Case**: Microservices architecture hoặc process isolation.

---

## 7. Framework Helpers

### 7.1. api.helper.js - API Utilities

**Purpose**: Provide reusable utilities for API development.

#### 7.1.1. PaginatedResponse

**Extended HttpResponse** cho paginated API responses:

```js
export class PaginatedResponse extends HttpResponse {
  constructor(data, metadata = {}, message = HTTP_STATUS_MESSAGE.OK) {
    super(HTTP_STATUS.OK, data, message, metadata)
  }

  toJSON() {
    const { page, limit, total, ...restMetadata } = this.metadata
    const totalPages = Math.ceil(total / limit)

    return {
      ...super.toJSON(),
      meta: {
        ...restMetadata,
        page,
        limit,
        total,
        totalPages,
      },
    }
  }
}
```

**Response Format**:

```json
{
  "success": true,
  "statusCode": 200,
  "data": [...],
  "message": "OK",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  },
  "timestamp": "2025-10-19T..."
}
```

**Usage**:

```js
router.get(
  '/',
  wrapController(async req => {
    const { list, total } = await getList(req.query)
    return new PaginatedResponse(list, {
      page: req.query.page,
      limit: req.query.limit,
      total,
    })
  })
)
```

#### 7.1.2. Standard Query Parameters

**stdGetListQueryParams** - Reusable schema cho list/pagination endpoints:

```js
export const stdQueryParams = {
  page: Joi.number().default(1).min(1).optional(),
  limit: Joi.number().max(1_000).default(10).optional(),
  q: Joi.string().max(256).trim().optional(), // search term
  sortBy: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  fields: Joi.array().items(Joi.string()).min(1).optional(), // field projection
}

export const stdGetListQueryParams = Joi.object(stdQueryParams)
```

**Query Examples**:

```bash
# Pagination
GET /api/posts?page=2&limit=20

# Search
GET /api/posts?q=nodejs

# Sorting
GET /api/posts?sortBy=createdAt

# Field projection
GET /api/posts?fields=title&fields=createdAt

# Combined
GET /api/posts?page=1&limit=10&sortBy=createdAt&fields=title&fields=content
```

### 7.2. mongodb.helper.js - MongoDB Utilities

**Purpose**: Utilities for MongoDB ObjectId operations and validation.

#### 7.2.1. ObjectId Validation

```js
export const isValidObjectIdString = value => {
  if (typeof value === 'string') {
    return /^[0-9a-f]{24}$/.test(value)
  }
  return false
}
```

**Usage**:

```js
if (!isValidObjectIdString(userId)) {
  throw new ValidationError('Invalid user ID format')
}
```

#### 7.2.2. ObjectId Creation

```js
export const makeObjectId = value => {
  if (!value) return new Types.ObjectId() // Generate new ID
  if (!isValidObjectIdString(value)) return value // Pass through invalid
  return new Types.ObjectId(value) // Convert string to ObjectId
}
```

**Usage**:

```js
const userId = makeObjectId(req.params.id)
const newId = makeObjectId() // Generate new ID
```

#### 7.2.3. ObjectId Comparison

```js
export const isSameObjectId = (a, b) => {
  if (!a || !b) return false

  try {
    const idA = a instanceof Types.ObjectId ? a : new Types.ObjectId(a)
    const idB = b instanceof Types.ObjectId ? b : new Types.ObjectId(b)
    return idA.equals(idB)
  } catch {
    return false // Invalid ObjectId
  }
}
```

**Usage**:

```js
if (isSameObjectId(post.authorId, currentUser.id)) {
  // User is author
}
```

#### 7.2.4. Joi Custom Validators

**isMongoIdDto** - Validation only:

```js
export const isMongoIdDto = (value, helpers) => {
  if (!isValidObjectIdString(value)) {
    return helpers.error(`${value} is not a valid MongoDB ObjectId`)
  }
  return value
}

// Usage
const schema = Joi.object({
  userId: Joi.string().custom(isMongoIdDto).required(),
})
```

**toMongoIdDto** - Validation + Transformation:

```js
export const toMongoIdDto = (value, helpers) => {
  if (!isValidObjectIdString(value)) {
    return helpers.error(`${value} is not a valid MongoDB ObjectId`)
  }
  return makeObjectId(value) // Transform to ObjectId
}

// Usage
const schema = Joi.object({
  userId: Joi.string().custom(toMongoIdDto).required(),
})
// After validation, req.body.userId is ObjectId instance
```

**makeMongoIdDto** - Transformation only (use with isMongoIdDto):

```js
export const makeMongoIdDto = value => {
  return makeObjectId(value)
}

// Usage
const schema = Joi.object({
  userId: Joi.string()
    .custom(isMongoIdDto) // Validate
    .custom(makeMongoIdDto) // Transform
    .required(),
})
```

**Best Practices**:

```js
// ✅ Good: Validate + Transform in one step
userId: Joi.string().custom(toMongoIdDto).required()

// ✅ Good: Explicit validation + transformation
userId: Joi.string().custom(isMongoIdDto).custom(makeMongoIdDto).required()

// ❌ Bad: Only transform without validation
userId: Joi.string().custom(makeMongoIdDto).required()
```

---

## 8. Configuration System

### 8.1. Environment Variables Validation

**env-schema.js** - Validation-first approach:

```js
// 1. Load .env file (với dotenv-safe)
config({
  path: '.env',
  example: '.env.example', // Ensure all required vars exist
})

// 2. Validate với Joi schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test', 'staging'),
  PORT: Joi.number().default(8000),
  JWT_SECRET: Joi.string().min(32).required(),
  MONGODB_URI: Joi.string().uri({ scheme: 'mongodb' }),
}).unknown(true)

// 3. Parse & validate (fail-fast)
const parsedEnv = validate(envSchema, process.env)
```

### 8.2. Application Configuration

**app.config.js** - Environment-based config merging:

```js
const rawConfig = {
  all: {
    env: env.NODE_ENV,
    port: env.PORT,
    jwtSecret: env.JWT_SECRET,
    mongo: { uri: env.MONGODB_URI },
  },
  development: {
    /* dev overrides */
  },
  production: {
    /* prod overrides */
  },
  test: {
    /* test overrides */
  },
}

// Merge base config with env-specific config
const config = merge(rawConfig.all, rawConfig[rawConfig.all.env])
```

### 8.3. Configuration Philosophy

**Two-Step Approach**:

1. **env-schema.js**: Validation-first (Joi schema, fail-fast)
2. **app.config.js**: Structure & merge (environment-based, organized)

**Benefits**:

- Type-safe environment variables
- Fail-fast on missing/invalid config
- Environment-specific overrides
- Single source of truth

---

## 9. Error Handling Strategy

### 9.1. Error Classification

```js
// Operational Errors (Expected, Recoverable)
ValidationError         // User input errors
NotFoundError          // Resource not found
UnauthorizedError      // Auth failures
BusinessError          // Business logic violations
→ isOperational: true

// Programming Errors (Bugs, Unexpected)
InternalServerError    // Code bugs
TypeError, ReferenceError
→ isOperational: false
```

### 9.2. Error Context & Chaining

```js
try {
  await database.query()
} catch (err) {
  throw new BaseError('Database query failed', {
    statusCode: 500,
    cause: err, // Original error
    context: { query: 'SELECT ...' },
    metadata: { timestamp, environment },
  })
}

// Get full error chain:
error.getErrorChain() // [current, cause1, cause2, ...]
```

### 9.3. Error Response Format

```js
// BaseError.toJSON() output:
{
  name: 'ValidationError',
  code: 'VALIDATION_ERROR',
  message: 'Request validation failed',
  statusCode: 400,
  isOperational: true,
  context: { errors: [...] },
  metadata: { timestamp, environment },
  stack: '...',           // Non-production only
  cause: { ... }          // Non-production only
}
```

### 9.4. Error Handling Best Practices

**1. Always use specific error classes**:

```js
// ❌ Bad
throw new Error('User not found')

// ✅ Good
throw new NotFoundError('User', userId)
```

**2. Chain errors for context**:

```js
try {
  await externalAPI.call()
} catch (err) {
  throw new ServiceUnavailableError('External API', err)
}
```

**3. Let middleware handle errors**:

```js
// ❌ Bad
async function handler(req, res) {
  try {
    const user = await getUser()
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ✅ Good
const handler = async (req, res) => {
  const user = await getUser()
  return new HttpResponse(200, user)
}
app.get('/users', wrapController(handler))
```

---

## 10. Request Context Management

### 10.1. AsyncLocalStorage Pattern

**Problem**: Track request-specific data (requestId, userId) across async operations without passing through every function.

**Solution**: AsyncLocalStorage (Node.js native API)

```js
// Access anywhere in request lifecycle
import { requestContextHelper } from '@/core/helpers/request-context.helper'

// Setup context (middleware)
app.use(
  requestContext({
    extractUserId: req => req.user?.id,
  })
)

async function deepNestedFunction() {
  const requestId = requestContextHelper.getContextValue('requestId')
  logger.info('Processing request', { requestId })
}
```

### 10.2. Context Structure

```js
{
  requestId: 'req_1697456789_abc123',  // Unique request ID
  method: 'POST',
  url: '/api/users',
  path: '/api/users',
  ip: '127.0.0.1',
  userAgent: 'Mozilla/5.0...',
  startTime: process.hrtime.bigint(),  // High-resolution timestamp (nanoseconds)
  userId: 123,                         // Custom extracted
  tenantId: 456                        // Custom metadata
}
```

### 10.3. Context Usage Patterns

**1. Logging with context**:

```js
// Logger automatically injects requestId and userId
logger.info('User created', { username: 'john' })
// Output: [2025-10-16 10:30:00 INFO] User created userId=123 reqId=req_123
```

**2. Custom context values**:

```js
requestContextHelper.setContextValue('tenantId', 456)
const tenantId = requestContextHelper.getContextValue('tenantId')
```

**3. Request ID tracking**:

```js
// Auto-generated if not provided in header
// Added to response header: X-Request-Id
// Used for distributed tracing
```

**4. Response Time Tracking**:

```js
// Automatic via add-response-time middleware
// Uses startTime from context
// Header: X-Response-Time: 123.4567
```

### 10.4. Security Considerations

- Dangerous keys (`__proto__`, `constructor`, `prototype`) are blocked
- Context is isolated per request (no cross-contamination)
- Circular reference detection in deep sanitization

---

## 11. Validation & Security

### 11.1. Prototype Pollution Protection

**Threat**: Attacker modifies `Object.prototype` via malicious input:

```js
// Malicious input
{ "__proto__": { "isAdmin": true } }
```

**Defense Layers**:

**1. Key Filtering**:

```js
DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype']
isDangerousKey(key) // Block dangerous keys
```

**2. Deep Sanitization**:

```js
deepSanitize(value)
// - Recursively traverse objects/arrays
// - Remove dangerous keys at all levels
// - Handle circular references
// - Preserve built-in objects (Date, RegExp)
```

**3. Request Validator**:

```js
requestValidator(schema, { removeUnknown: true })
// - Validate with Joi
// - Deep sanitize all input
// - Filter unknown fields
// - Safe assignment to req object
```

### 11.2. Joi Schema Patterns

**Basic Validation**:

```js
const schema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    age: Joi.number().min(18).max(100),
    role: Joi.string().valid('admin', 'user').default('user'),
  }).unknown(true), // MUST use .unknown(true) for filtering
}
```

**Nested Objects**:

```js
const schema = {
  body: Joi.object({
    user: Joi.object({
      name: Joi.string().required(),
      address: Joi.object({
        city: Joi.string(),
        country: Joi.string(),
      }),
    }),
  }).unknown(true),
}
```

**Custom Validation**:

```js
const schema = {
  body: Joi.object({
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/)
      .message('Password must contain uppercase, lowercase and digit'),
  }),
}
```

### 11.3. Security Headers

```js
X-Content-Type-Options: nosniff           // Prevent MIME sniffing
X-Frame-Options: DENY                     // Prevent clickjacking
X-XSS-Protection: 1; mode=block          // XSS filter
Content-Security-Policy: default-src 'none'  // CSP
Referrer-Policy: no-referrer             // No referrer leakage
Permissions-Policy: geolocation=()        // Feature policy
```

### 11.4. Input Sanitization Pipeline

```
Raw Input → Joi Validation → Deep Sanitize → Filter Unknown → Safe Output
```

**Example**:

```js
// Input (malicious)
{
  name: 'John',
  __proto__: { isAdmin: true },
  constructor: 'hacked',
  extra: 'unknown'
}

// After validation + sanitization
{
  name: 'John'
  // __proto__, constructor removed
  // extra removed (if removeUnknown: true)
}
```

---

## 12. Build & Development Workflow

### 12.1. Scripts Overview

```json
{
  "dev": "nodemon --exec babel-node src/bootstrap.js",
  "start": "node dist/bootstrap.js",
  "build": "babel src --out-dir dist --source-maps",
  "test": "jest",
  "lint": "eslint src --ext .js",
  "format": "prettier --write src/**/*.js"
}
```

### 12.2. Development Workflow

**1. Development Mode**:

```bash
pnpm dev
# - Nodemon watches src/
# - Babel transpiles on-the-fly
# - Hot reload on file changes
```

**2. Testing**:

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:cov          # Coverage report
```

**3. Linting & Formatting**:

```bash
pnpm lint              # Check lint errors
pnpm lint:fix          # Auto-fix lint errors
pnpm format            # Format code with Prettier
```

### 12.3. Build Process

**Development Build**:

```bash
pnpm build:dev
# - Babel watch mode
# - Source maps enabled
# - Comments preserved
```

**Production Build**:

```bash
pnpm build
# - Babel transpile to dist/
# - Remove console.log (except error/warn/info)
# - Minified output
# - Source maps for debugging
```

### 12.4. Babel Configuration

**Target**: Node.js 18+, CommonJS modules

**Plugins**:

- `@babel/plugin-transform-runtime` - Polyfills
- `module-resolver` - Path aliases (@/core, @/framework)
- `transform-remove-console` - Remove console.log in production
- Class properties, private methods, optional chaining, nullish coalescing

**Environment-specific**:

- **development**: Inline source maps, retain lines
- **production**: Remove console, no comments
- **test**: Current node version

### 12.5. ESLint Configuration

**Plugins**:

- `@eslint/js` - Recommended rules
- `eslint-plugin-import` - Import/export validation
- `eslint-plugin-security` - Security checks
- `eslint-plugin-jest` - Jest rules

**Key Rules**:

- `no-undef`, `no-unused-vars` - Code quality
- `import/no-unresolved`, `import/no-cycle` - Import checks
- `security/detect-object-injection` - Security warnings

### 12.6. Git Workflow

**Conventional Commits**:

```
feat(scope): add new feature
fix(scope): fix bug
refactor(scope): refactor code
docs(scope): update documentation
```

**Release Process**:

```bash
pnpm release           # Automated release with standard-version
# - Bump version
# - Generate CHANGELOG.md
# - Create git tag
# - Commit changes

git push --follow-tags
```

**Commit Scopes**: `core`, `modules`, `config`, `deps`, `docs`, `ci`, `dx`

---

## 13. Best Practices & Patterns

### 13.1. Error Handling

**✅ DO**:

```js
// Use specific error classes
throw new NotFoundError('User', userId)

// Chain errors for context
catch (err) {
  throw new InternalServerError('Failed to create user', err)
}

// Let middleware handle errors
const handler = async (req) => {
  return await getUser(req.params.id)
}
app.get('/users/:id', wrapController(handler))
```

**❌ DON'T**:

```js
// Generic errors
throw new Error('Something went wrong')

// Swallowing errors
catch (err) { /* ignore */ }

// Manual error handling in controllers
catch (err) {
  res.status(500).json({ error: err.message })
}
```

### 13.2. Validation

**✅ DO**:

```js
// Validate at route level
const schema = {
  body: Joi.object({ email: Joi.string().email() }).unknown(true)
}
app.post('/users', requestValidator(schema), handler)

// Use Joi for complex validation
const schema = Joi.object({
  age: Joi.number().min(18),
  email: Joi.string().email().required()
})
```

**❌ DON'T**:

```js
// Manual validation
if (!req.body.email) {
  return res.status(400).json({ error: 'Email required' })
}

// Type coercion without validation
const age = Number(req.query.age)
```

### 13.3. Logging

**✅ DO**:

```js
// Use appropriate log levels
logger.error('Database connection failed', { error })
logger.warn('Deprecated API used', { endpoint })
logger.info('User logged in', { userId })
logger.debug('Processing request', { data })

// Add context
logger.info('Order created', { orderId, userId, total })
```

**❌ DON'T**:

```js
// console.log in production code
console.log('Debug info')

// Logging sensitive data
logger.info('User data', { password: user.password })

// Using wrong log level
logger.error('User logged in') // Should be info
```

### 13.4. Controller Design

**✅ DO**:

```js
// Return data, let middleware format response
const getUser = async req => {
  const user = await User.findById(req.params.id)
  if (!user) throw new NotFoundError('User', req.params.id)
  return user
}

// Wrap with middleware
app.get('/users/:id', wrapController(getUser))
```

**❌ DON'T**:

```js
// Manual response formatting
const getUser = async (req, res) => {
  const user = await User.findById(req.params.id)
  res.json({
    success: true,
    data: user,
    timestamp: new Date(),
  })
}
```

### 13.5. Configuration

**✅ DO**:

```js
// Use config object, not process.env
import config from '@/configs'

// Validate env vars at startup
const envSchema = Joi.object({
  PORT: Joi.number().required(),
  JWT_SECRET: Joi.string().min(32).required(),
})

const port = config.port
```

**❌ DON'T**:

```js
// Direct process.env access
const port = process.env.PORT || 8000

// No validation
const jwtSecret = process.env.JWT_SECRET // Might be undefined
```

### 13.6. Middleware Order

**✅ DO**:

```js
// Correct order matters
app.use(express.json()) // 1. Body parsing
app.use(securityHeaders) // 2. Security
app.use(requestContext()) // 3. Context setup
app.use(requestLogger) // 4. Logging
// ... routes with validation
app.use(errorHandler) // Last: Error handling
```

**❌ DON'T**:

```js
// Wrong order
app.use(errorHandler) // Too early
app.use(requestLogger) // Before context setup
app.use(requestContext())
```

### 13.7. Async/Await Patterns

**✅ DO**:

```js
// Use wrapController for async handlers
const handler = async req => {
  return await service.process(req.body)
}
app.post('/process', wrapController(handler))

// Parallel async operations
const [users, posts] = await Promise.all([getUsers(), getPosts()])
```

**❌ DON'T**:

```js
// Unhandled promise rejections
app.get('/users', async (req, res) => {
  const users = await getUsers() // Will crash if rejected
  res.json(users)
})

// Sequential when could be parallel
const users = await getUsers()
const posts = await getPosts() // Waits for users unnecessarily
```

### 13.8. Security

**✅ DO**:

```js
// Always sanitize user input
requestValidator(schema, { removeUnknown: true })

// Use parameterized queries
User.find({ _id: userId })

// Set security headers
app.use(securityHeaders)
```

**❌ DON'T**:

```js
// Trust user input
req.body.role = 'admin' // Can be prototype pollution

// String concatenation in queries
const query = `SELECT * FROM users WHERE id = ${userId}`

// Missing security headers
```

### 13.9. Testing

**✅ DO**:

```js
// Test pure functions (utils)
describe('deepSanitize', () => {
  it('should remove __proto__', () => {
    const input = { __proto__: { isAdmin: true } }
    const output = deepSanitize(input)
    expect(output).toEqual({})
  })
})

// Test middleware
describe('requestValidator', () => {
  it('should reject invalid input', () => {
    // ... test validation logic
  })
})
```

**❌ DON'T**:

```js
// Skip edge cases
it('should work', () => {
  expect(func(validInput)).toBe(expectedOutput)
  // Missing: null, undefined, malicious input tests
})
```

### 13.10. Code Organization

**✅ DO**:

```js
// Group by feature (modules)
modules / users / user.controller.js
user.service.js
user.model.js
user.validation.js

// Clear separation of concerns
// Core: Framework-agnostic
// Framework: Express-specific
// Modules: Business logic
```

**❌ DON'T**:

```js
// Group by type (anti-pattern)
controllers / user.controller.js
post.controller.js
services / user.service.js
post.service.js
models / user.model.js
post.model.js
// Hard to find related files
```

---

## 📚 Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Joi Documentation](https://joi.dev/)
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Node.js Error Handling](https://nodejs.org/en/docs/guides/error-handling/)

---

## 📝 Quick Reference Card

### Common Imports

```js
// Config
import config from '@/configs'
// Errors
import {
  BaseError,
  NotFoundError,
  ValidationError,
} from '@/helpers/error.helper'
// Logger
import logger from '@/helpers/logger.helper'
// Validation
import { Joi, validate } from '@/helpers/validator.helper'
// Utils
import { merge, pick, snooze } from '@/utils/common.util'
import { deepSanitize, isDangerousKey } from '@/utils/security.util'

// Context
import { requestContextHelper } from '@/core/helpers/request-context.helper'

// Framework
import { createApp } from '@/framework/express.loader'
// Middleware
import { requestValidator } from '@/framework/middleware/request-validator.middleware'
import { wrapController } from '@/framework/middleware/wrap-controller.middleware'
import {
  registerShutdownTask,
  setupGracefulShutdown,
} from '@/framework/shutdown.helper'
```

### Common Patterns

**Full Application Setup**:

```js
import config from '@/configs'

import { APP_NAME } from '@/core/constants/common.constant'

import { createApp } from '@/framework/express.loader'
import {
  registerShutdownTask,
  setupGracefulShutdown,
} from '@/framework/shutdown.helper'

// Create app with routes
const app = createApp(APP_NAME.MAIN, app => {
  app.use('/api/users', userRoutes)
  app.use('/api/posts', postRoutes)
})

// Register cleanup tasks (optional)
registerShutdownTask(async () => {
  await mongoose.disconnect()
}, 'mongodb-disconnect')

// Start server
const server = app.listen(config.port, err => {
  if (err) {
    logger.error('Failed to start', { err })
    process.exit(1)
  }
  logger.info(`Server running on port ${config.port}`)
})

// Enable graceful shutdown
setupGracefulShutdown(server, { timeoutMs: 10000 })
```

**Controller with Validation**:

```js
const schema = {
  params: Joi.object({ id: Joi.string().required() }).unknown(true),
  body: Joi.object({ name: Joi.string() }).unknown(true),
}

const updateUser = async req => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body)
  if (!user) throw new NotFoundError('User', req.params.id)
  return new HttpResponse(200, user, 'User updated')
}

app.put('/users/:id', requestValidator(schema), wrapController(updateUser))
```

**Service with Error Handling**:

```js
class UserService {
  async createUser(data) {
    try {
      const user = await User.create(data)
      logger.info('User created', { userId: user.id })
      return user
    } catch (err) {
      if (err.code === 11000) {
        throw new ConflictError('Email already exists', { email: data.email })
      }
      throw new InternalServerError('Failed to create user', err)
    }
  }
}
```

---

**End of Architecture Overview**
