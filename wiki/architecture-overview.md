# Architecture Overview

> Tài liệu tổng hợp kiến trúc và patterns của ExpressJS CRUD project
>
> **Author:** Dang Duc B. Dzung (David)  
> **Last Updated:** October 25, 2025  
> **Version:** 2.0 (Full codebase sync)

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
- [10. Internationalization (i18n)](#10-internationalization-i18n)
- [11. Caching Strategy](#11-caching-strategy)
- [12. Build & Development Workflow](#12-build--development-workflow)
- [13. Best Practices & Patterns](#13-best-practices--patterns)

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
expressjs/
├── src/                     # Source code
│   ├── apps/               # Application entry points
│   │   └── main.js        # Main app entry (orchestrator)
│   ├── configs/            # Configuration layer
│   │   ├── env-schema.js  # Environment validation (Joi)
│   │   ├── app.config.js  # Application config (merged by env)
│   │   └── index.js       # Config exports
│   ├── core/               # Core cross-cutting concerns
│   │   ├── constants/     # Constants (HTTP status, log levels)
│   │   │   ├── common.constant.js
│   │   │   ├── http-status.constant.js
│   │   │   ├── message.constant.js
│   │   │   └── index.js
│   │   ├── helpers/       # Helpers (error, logger, validator, request-context, http-response)
│   │   │   ├── error.helper.js
│   │   │   ├── logger.helper.js
│   │   │   ├── validator.helper.js
│   │   │   ├── request-context.helper.js
│   │   │   ├── http-response.helper.js
│   │   │   └── index.js
│   │   ├── utils/         # Utilities (common, security, type-check)
│   │   │   ├── common.util.js
│   │   │   ├── security.util.js
│   │   │   ├── type-check.util.js
│   │   │   ├── index.js
│   │   │   └── tests/     # Unit tests
│   │   │       ├── security.util.spec.js
│   │   │       └── type-check.util.spec.js
│   │   └── Throwable.js   # Interface for error/response objects
│   ├── framework/          # Express-specific layer
│   │   ├── express.loader.js   # Express app factory
│   │   ├── shutdown.helper.js  # Graceful shutdown system
│   │   ├── helpers/       # Framework helpers
│   │   │   ├── api.helper.js   # API utilities (PaginatedResponse, query params)
│   │   │   ├── mongodb.helper.js # MongoDB utilities (ObjectId helpers)
│   │   │   └── index.js
│   │   └── middleware/    # Express middleware
│   │       ├── request-context.middleware.js
│   │       ├── request-logger.middleware.js
│   │       ├── request-validator.middleware.js
│   │       ├── add-response-time.middleware.js
│   │       ├── not-found.middleware.js
│   │       ├── error-handler.middleware.js
│   │       ├── wrap-controller.middleware.js
│   │       ├── index.js
│   │       └── tests/     # Middleware tests
│   │           └── request-validator.security.spec.js
│   └── modules/            # Business modules
│       ├── main.route.js   # Main routes registry
│       ├── authentication/ # Auth module (planned)
│       └── _post_/        # Post module (example)
│           ├── mock-post.js     # Mock data
│           ├── post.route.js    # Routes
│           ├── services/        # Business logic
│           │   └── post.service.js
│           ├── usecases/        # Use cases (orchestration)
│           │   └── post-crud.usecase.js
│           └── validators/      # Validation schemas
│               └── post.validator.js
├── dist/                    # Compiled output (Babel)
├── logs/                    # Application logs (Winston)
├── scripts/                 # Automation scripts
│   ├── automate-cli.sh
│   ├── release-dry-run.sh
│   └── release-help.sh
├── wiki/                    # Project documentation
│   ├── architecture-overview.md
│   ├── release-convention.md
│   └── workflow.png
├── babel.config.js         # Babel configuration
├── eslint.config.mjs       # ESLint configuration
├── jsconfig.json           # JavaScript config (path aliases)
├── nodemon.json            # Nodemon configuration
├── package.json            # Dependencies & scripts
├── pnpm-lock.yaml          # Lock file
└── README.md               # Project README
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
app.use(i18nMiddleware())                  // i18n localization (FIRST)
app.use(requestContext({ ... }))           // AsyncLocalStorage context
app.use(requestLogger)                     // Morgan + Winston logging
app.use(addResponseTime)                   // X-Response-Time header
app.use(cors())                            // CORS headers
app.use(compression())                     // Gzip compression
app.use(helmet())                          // Security headers
app.use(express.json())                    // JSON body parser
app.use(express.json() error handler)      // Handle JSON parse errors
app.use(express.urlencoded())              // URL-encoded parser

// Stage 2: Routes (via callback parameter)
callback(app)

// Stage 3: Error handlers (auto-registered, must be last)
app.use(notFound)                          // 404 handler
app.use(errorHandler)                      // Global error handler
```

**⚠️ IMPORTANT - Middleware Order Rationale**:

1. **i18nMiddleware()** - FIRST để setup `req.t()` cho các middleware sau
2. **requestContext()** - Setup AsyncLocalStorage context cho toàn bộ request
3. **requestLogger** - Log sau khi có context (requestId, userId)
4. **addResponseTime** - Hook vào res.writeHead() sớm
5. **Security middleware** (cors, compression, helmet) - Trước khi parse body
6. **Body parsers** - Parse request body
7. **Routes** - Business logic
8. **Error handlers** - LAST để catch tất cả errors

**Order matters!** Sai thứ tự sẽ dẫn đến context bị mất, log thiếu thông tin, hoặc security headers không được set.

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

#### 4.3.0. localize.middleware.js (i18nMiddleware)

**Purpose**: Setup i18n localization cho Express với auto language detection.

```js
import { i18nMiddleware } from '@/framework/middleware/localize.middleware'

app.use(
  i18nMiddleware({
    fallbackLng: 'en',
    preload: ['en', 'vi', 'es'],
  })
)
```

**How It Works**:

1. Initialize i18n instance via `initI18n()`
2. Return `i18next-http-middleware` handler
3. Inject `req.t()` function for translations
4. Auto-detect language from:
   - `Accept-Language` header (default)
   - `?lang=vi` query parameter
   - Cookie (if enabled)

**Usage in Controllers**:

```js
app.get('/hello', (req, res) => {
  res.json({
    message: req.t('welcome'),
    user: req.t('user.greeting', { name: 'John' }),
  })
})
```

**Language Detection Priority**:

1. Query parameter (`?lang=vi`) - highest
2. Accept-Language header
3. Cookie (disabled by default)
4. Fallback language (`en`)

**⚠️ MUST BE FIRST** middleware để ensure `req.t()` available cho tất cả middleware/routes sau.

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

## 10. Internationalization (i18n)

### 10.1. Overview

Project supports **multi-language** via `i18next` với:

- **Server-side translations**: `req.t()` trong controllers
- **Auto language detection**: Header / query / cookie
- **Namespace organization**: Modules có thể có namespaces riêng
- **Fallback mechanism**: En → fallback language → key

### 10.2. Architecture

```
src/
├── framework/
│   ├── helpers/
│   │   └── i18n.helper.js          # Global i18n instance & utilities
│   └── middleware/
│       └── localize.middleware.js  # Express middleware wrapper
└── locales/
    ├── en/
    │   └── common.json             # English translations
    └── vi/
        └── common.json             # Vietnamese translations
```

### 10.3. Setup & Configuration

**Step 1: Initialize i18n** (in `express.loader.js`):

```js
import { i18nMiddleware } from '@/framework/middleware/localize.middleware'

const app = express()
app.use(i18nMiddleware()) // FIRST middleware
```

**Step 2: Create translation files**:

```json
// locales/en/common.json
{
  "welcome": "Welcome to our API",
  "user": {
    "notFound": "User with ID {{id}} not found",
    "created": "User created successfully"
  },
  "validation": {
    "required": "{{field}} is required",
    "invalid": "{{field}} is invalid"
  }
}
```

```json
// locales/vi/common.json
{
  "welcome": "Chào mừng đến API của chúng tôi",
  "user": {
    "notFound": "Không tìm thấy người dùng với ID {{id}}",
    "created": "Tạo người dùng thành công"
  },
  "validation": {
    "required": "{{field}} là bắt buộc",
    "invalid": "{{field}} không hợp lệ"
  }
}
```

### 10.4. Usage Patterns

**Pattern 1: In Request Context** (most common):

```js
router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) {
    throw new NotFoundError(req.t('user.notFound', { id: req.params.id }))
  }

  res.json({
    message: req.t('user.found'),
    data: user,
  })
})
```

**Pattern 2: Outside Request Context**:

```js
import { t } from '@/framework/helpers/i18n.helper'

// In service layer or background jobs
const message = t('user.created', { lng: 'vi', name: 'John' })
logger.info(message)
```

**Pattern 3: Dynamic Language Switch**:

```js
import { changeLanguage } from '@/framework/helpers/i18n.helper'

// Change default language
await changeLanguage('vi')
```

### 10.5. Language Detection

**Detection Order** (configurable):

```js
detection: {
  order: ['header', 'querystring', 'cookie'],
  lookupHeader: 'accept-language',      // Accept-Language: vi
  lookupQuerystring: 'lang',            // ?lang=vi
  caches: false                          // Don't cache in cookie
}
```

**Examples**:

```bash
# Via header (default)
curl -H "Accept-Language: vi" https://api.example.com/users

# Via query parameter (override header)
curl https://api.example.com/users?lang=vi

# Via cookie (if enabled)
curl -H "Cookie: i18next=vi" https://api.example.com/users
```

### 10.6. Best Practices

**✅ DO**:

```js
// Use nested keys for organization
req.t('user.validation.email.required')

// Use interpolation
req.t('user.greeting', { name: user.name })

// Provide context
req.t('item.count', { count: 5 }) // Pluralization support
```

**❌ DON'T**:

```js
// Hardcoded strings
throw new Error('User not found') // ❌

// Use req.t() correctly
throw new NotFoundError(req.t('user.notFound', { id })) // ✅
```

### 10.7. Testing Translations

```js
import { exists, t } from '@/framework/helpers/i18n.helper'

describe('i18n', () => {
  it('should translate key', () => {
    expect(t('welcome', { lng: 'en' })).toBe('Welcome to our API')
    expect(t('welcome', { lng: 'vi' })).toBe('Chào mừng đến API của chúng tôi')
  })

  it('should check key existence', () => {
    expect(exists('welcome', { lng: 'en' })).toBe(true)
    expect(exists('nonexistent.key', { lng: 'en' })).toBe(false)
  })
})
```

---

## 11. Caching Strategy

### 11.1. Overview

Project implements **Redis-based caching** với:

- **Deterministic key generation**: Same query → same key
- **TTL management**: Configurable expiration per cache
- **User-specific caching**: Multi-tenant support
- **Size monitoring**: Warn on large cache entries
- **Auto-cleanup**: Graceful shutdown disconnect

### 11.2. Architecture

```
framework/
└── helpers/
    ├── redis.helper.js      # Low-level Redis connection
    └── cache.helper.js      # High-level caching utilities
```

**Layer Separation**:

- `redis.helper.js`: Connection management, auto-reconnect, graceful shutdown
- `cache.helper.js`: Key generation, serialization, TTL handling

### 11.3. Redis Connection Management

**Features**:

```js
import {
  connectRedis,
  disconnectRedis,
  getClient,
} from '@/framework/helpers/redis.helper'

// Connect (in app startup)
await connectRedis()

// Get client (auto-connect if needed)
const client = await getClient()
await client.set('key', 'value', { EX: 60 })
const value = await client.get('key')

// Disconnect (auto-registered in shutdown)
await disconnectRedis()
```

**Connection State Machine**:

```
┌─────────────────┐
│  client = null  │ ──getClient()──> [connecting] ──success──> [connected]
└─────────────────┘                      │                         │
         ▲                               │                         │
         │                               └──────error──────────────┘
         │
         └──────────────────────disconnectRedis()────────────────┘
```

**Singleton Pattern**: Prevents duplicate connections

```js
let client = null
let isConnecting = false
let connectionPromise = null

export const getClient = async () => {
  if (client?.isOpen) return client // ✅ Already connected
  if (isConnecting) return connectionPromise // ⏳ Wait for pending

  isConnecting = true
  connectionPromise = connectRedis() // 🔄 Connect now

  try {
    await connectionPromise
    return client
  } finally {
    isConnecting = false
    connectionPromise = null
  }
}
```

### 11.4. Cache Key Strategy

**Key Format**:

```
{cachePrefix}_{service}:{key-value pairs}

Example:
myapp_main:model=post:alias=post-list:userId=123:query=a3d5e9f1
```

**Key Generation Pipeline**:

```
Input Query Params → Flatten Nested → Sort Keys → Serialize → Hash (prod) → Build Key
```

**Example**:

```js
// Input
{
  page: 1,
  limit: 10,
  filters: { status: 'active', author: 'john' }
}

// Step 1: Flatten
{
  page: 1,
  limit: 10,
  'filters.status': 'active',
  'filters.author': 'john'
}

// Step 2: Sort & Serialize
'filters.author=john|filters.status=active|limit=10|page=1'

// Step 3: Hash (production only)
'a3d5e9f1b2c4567890abcdef'

// Step 4: Build Key
'myapp_main:model=post:alias=post-list:query=a3d5e9f1b2c4567890abcdef'
```

**Why Deterministic Keys?**

- ✅ Same query params → same key (regardless of order)
- ✅ Easy debugging (readable in development)
- ✅ Efficient (hashed in production to save memory)

### 11.5. Cache Usage Patterns

**Pattern 1: Cache-Aside (Lazy Loading)**:

```js
router.get(
  '/',
  wrapController(async req => {
    // 1. Try cache first
    const cache = await getCache({
      model: 'post',
      alias: 'post-list',
      queryParams: req.query,
    })

    if (cache.success && cache.data) {
      return new PaginatedResponse(cache.data.list, {
        ...req.query,
        total: cache.data.total,
      })
    }

    // 2. Cache miss → fetch from DB
    const { list, total } = await postService.getList(req.query)

    // 3. Update cache for next request
    await setCache({
      model: 'post',
      alias: 'post-list',
      queryParams: req.query,
      data: { list, total },
      expire: 60, // 1 minute
    })

    return new PaginatedResponse(list, { ...req.query, total })
  })
)
```

**Pattern 2: Write-Through Cache**:

```js
router.post(
  '/',
  wrapController(async req => {
    // 1. Create in DB
    const post = await postService.create(req.body)

    // 2. Invalidate list cache
    await delCache({
      model: 'post',
      alias: 'post-list',
      queryParams: {}, // Delete all list caches
    })

    // 3. Cache individual post
    await setCache({
      model: 'post',
      alias: 'post-detail',
      queryParams: { id: post.id },
      data: post,
      expire: 300, // 5 minutes
    })

    return post
  })
)
```

**Pattern 3: User-Specific Cache**:

```js
// Cache per user
await setCache({
  model: 'user-dashboard',
  alias: 'dashboard-stats',
  userId: req.user.id, // User-specific
  queryParams: { period: '7d' },
  data: stats,
  expire: 600, // 10 minutes
})

// Get user's cache
const cache = await getCache({
  model: 'user-dashboard',
  alias: 'dashboard-stats',
  userId: req.user.id,
  queryParams: { period: '7d' },
})
```

### 11.6. Cache Invalidation Strategies

**Strategy 1: Time-Based (TTL)**:

```js
// Short TTL for frequently changing data
await setCache({ ..., expire: 60 })        // 1 minute

// Long TTL for static data
await setCache({ ..., expire: 86400 })     // 24 hours

// No expiration (manual invalidation)
await setCache({ ..., expire: 0 })         // Never expire
```

**Strategy 2: Event-Based**:

```js
// On create/update/delete → invalidate related caches
router.post('/', async (req, res) => {
  await postService.create(req.body)

  // Invalidate list caches
  await delCache({ model: 'post', alias: 'post-list' })
  await delCache({ model: 'post', alias: 'post-count' })
})
```

**Strategy 3: Cache Warming**:

```js
// Pre-populate cache during low traffic
async function warmCache() {
  const popularPosts = await postService.getPopular()

  for (const post of popularPosts) {
    await setCache({
      model: 'post',
      alias: 'post-detail',
      queryParams: { id: post.id },
      data: post,
      expire: 3600,
    })
  }
}

// Run periodically via cron or queue
```

### 11.7. Cache Monitoring

**Size Monitoring**:

```js
// Automatically warns on large entries
if (sizeInMB > 100) {
  logger.warn('Large cache entry', { key, sizeMB })
}
```

**Cache Metadata**:

```js
// Injected automatically
{
  ...yourData,
  _cachedAt: 1729876543210,   // Timestamp
  _expire: 60                  // TTL in seconds
}
```

**Debugging**:

```bash
# Development: Keys are human-readable
myapp_main:model=post:alias=post-list:query=page=1|limit=10

# Production: Keys are hashed for efficiency
myapp_main:model=post:alias=post-list:query=a3d5e9f1b2c4
```

### 11.8. Best Practices

**✅ DO**:

```js
// Use appropriate TTL
await setCache({ ..., expire: 60 })     // Frequent changes
await setCache({ ..., expire: 3600 })   // Stable data

// Use alias for clarity
await setCache({ model: 'post', alias: 'post-popular-list' })

// Handle cache errors gracefully
const cache = await getCache({ ... })
if (!cache.success) {
  logger.warn('Cache miss, fetching from DB', cache.error)
  // Fallback to DB
}

// Invalidate on write operations
await postService.create(data)
await delCache({ model: 'post', alias: 'post-list' })
```

**❌ DON'T**:

```js
// Don't cache without expiration
await setCache({ ..., expire: 0 })      // ❌ Cache forever

// Don't cache large objects blindly
await setCache({ data: hugeArray })     // ❌ Check size first

// Don't forget error handling
const data = await getCache({ ... }).data  // ❌ Might be null
if (data) { /* use data */ }               // ✅ Check first
```

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

### 7.2. i18n.helper.js - Internationalization Helper

**Purpose**: Global i18n instance và translation utilities để support multiple languages.

**Core Functions**:

```js
import {
  changeLanguage,
  exists,
  initI18n,
  t,
} from '@/framework/helpers/i18n.helper'

// Initialize i18n (called once at app startup)
initI18n({
  fallbackLng: 'en',
  preload: ['en', 'vi'],
  ns: ['common'],
  defaultNS: 'common',
  localesPath: 'src/locales/{{lng}}/{{ns}}.json',
})

// Translate outside request context
const message = t('welcome', { lng: 'vi' })
const greeting = t('greeting', { name: 'John', lng: 'en' })

// Check if translation key exists
if (exists('user.notFound', { lng: 'en' })) {
  // ...
}

// Change language dynamically
await changeLanguage('vi')
```

**Configuration**:

```js
// Language detection order
detection: {
  order: ['header', 'querystring', 'cookie'],  // Priority order
  lookupHeader: 'accept-language',             // Check Accept-Language header
  lookupQuerystring: 'lang',                   // Check ?lang=vi
  caches: false                                 // Don't cache in cookie
}
```

**Usage in Controllers** (với middleware):

```js
// After i18nMiddleware is applied
app.get('/hello', (req, res) => {
  res.json({
    message: req.t('welcome'), // Use request language
    error: req.t('errors.notFound', { id: 123 }), // With interpolation
  })
})
```

**File Structure**:

```
src/locales/
├── en/
│   └── common.json       # English translations
└── vi/
    └── common.json       # Vietnamese translations
```

**Translation File Example** (`locales/en/common.json`):

```json
{
  "welcome": "Welcome to our application",
  "greeting": "Hello, {{name}}!",
  "errors": {
    "notFound": "Resource with ID {{id}} not found",
    "validation": "Validation failed"
  }
}
```

### 7.3. redis.helper.js - Redis Connection Manager

**Purpose**: Manage Redis connection lifecycle với auto-reconnect và graceful shutdown.

**Core Functions**:

```js
import {
  connectRedis,
  disconnectRedis,
  getClient,
} from '@/framework/helpers/redis.helper'

// Connect to Redis (typically in app startup)
await connectRedis()

// Get client (auto-connect if needed)
const client = await getClient()
await client.set('key', 'value')
const value = await client.get('key')

// Disconnect (auto-registered in shutdown tasks)
await disconnectRedis()
```

**Features**:

- **Auto-reconnect**: Exponential backoff (100ms → 3000ms)
- **Connection pooling**: Singleton pattern với lazy initialization
- **Graceful shutdown**: Auto-registered cleanup task
- **Error handling**: Event-based error logging

**Connection State Management**:

```js
// Module state
let client = null
let isConnecting = false
let connectionPromise = null // Prevent duplicate connections

// getClient() ensures single connection
export const getClient = async () => {
  if (client?.isOpen) return client // Return existing

  if (isConnecting && connectionPromise) {
    // Wait for pending
    return connectionPromise
  }

  isConnecting = true
  connectionPromise = connectRedis()

  try {
    await connectionPromise
    return client
  } finally {
    isConnecting = false
    connectionPromise = null
  }
}
```

**Configuration** (from `app.config.js`):

```js
redis: {
  uri: 'redis://localhost:6379',
  defaultTTL: 300,                  // 5 minutes
  cachePrefix: 'myapp'              // Key prefix
}
```

### 7.4. cache.helper.js - Redis Caching Layer

**Purpose**: High-level caching utilities với key generation, serialization, và TTL management.

**Core Functions**:

```js
import { setCache, getCache, delCache } from '@/framework/helpers/cache.helper'

// Set cache with TTL
await setCache({
  model: 'post',
  alias: 'post-list',
  userId: '123',                    // Optional: user-specific cache
  queryParams: { page: 1, limit: 10 },
  data: { list: [...], total: 100 },
  expire: 60                        // 60 seconds
})
// Returns: { success: true, key: '...', expire: 60, error: null }

// Get cache
const result = await getCache({
  model: 'post',
  alias: 'post-list',
  userId: '123',
  queryParams: { page: 1, limit: 10 }
})
// Returns: { success: true, data: {...}, error: null }

// Delete cache
await delCache({
  model: 'post',
  alias: 'post-list',
  userId: '123',
  queryParams: { page: 1, limit: 10 }
})
```

**Key Generation Strategy**:

```js
// Key format: {prefix}_{service}:{key-value pairs}
// Example: myapp_main:model=post:alias=post-list:userId=123:query=abc123def

buildKey({ model, alias, userId, queryParams })
// 1. Flatten nested queryParams
// 2. Sort keys deterministically
// 3. Hash in production (MD5), raw in dev
// 4. Build key with delimiter
```

**Query Params Normalization**:

```js
// Input
{ page: 1, limit: 10, filters: { status: 'active' } }

// Flattened
{ page: 1, limit: 10, 'filters.status': 'active' }

// Sorted & serialized
'filters.status=active|limit=10|page=1'

// Hashed (production only)
'a3d5e9f1b2c4...'
```

**Features**:

- **Deterministic keys**: Same query → same key
- **Size monitoring**: Warns if cache > 100MB
- **Metadata injection**: `_cachedAt`, `_expire` added to data
- **Error handling**: Returns `{ success, data, error }` tuple
- **User-specific caching**: Support multi-tenant scenarios

**Usage Example in Route**:

```js
router.get(
  '/',
  requestValidator(getListDto),
  wrapController(async req => {
    // Try cache first
    const cache = await getCache({
      model: 'post',
      alias: 'post-getList',
      queryParams: req.query,
    })

    if (cache.success && cache.data) {
      return new PaginatedResponse(cache.data.list, {
        page: req.query.page,
        limit: req.query.limit,
        total: cache.data.total,
      })
    }

    // Cache miss → fetch from DB
    const { list, total } = await postCrudUsecase.getListPostUsecase(req.query)

    // Set cache for next request
    await setCache({
      model: 'post',
      alias: 'post-getList',
      queryParams: req.query,
      data: { list, total },
      expire: 60,
    })

    return new PaginatedResponse(list, {
      page: req.query.page,
      limit: req.query.limit,
      total,
    })
  })
)
```

### 7.5. dayjs.helper.js - Date Utilities

**Purpose**: Centralized date/time handling với timezone support.

```js
import dayjs, { DEFAULT_TIMEZONE } from '@/framework/helpers/dayjs.helper'

// Default timezone: Asia/Ho_Chi_Minh
const now = dayjs().tz(DEFAULT_TIMEZONE)
const formatted = now.format('YYYY-MM-DD HH:mm:ss')

// Parse and convert timezone
const utcDate = dayjs.utc('2025-10-25')
const localDate = utcDate.tz(DEFAULT_TIMEZONE)
```

**Plugins Enabled**:

- `dayjs/plugin/utc` - UTC support
- `dayjs/plugin/timezone` - Timezone conversion

### 7.6. mongodb.helper.js - MongoDB Utilities

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
// ===== CONFIG =====
import config from '@/configs'

// ===== CORE LAYER =====
// Errors
import {
  BaseError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@/core/helpers/error.helper'
// HTTP Response
import { HttpResponse } from '@/core/helpers/http-response.helper'
// Logger
import logger from '@/core/helpers/logger.helper'
// Context
import { requestContextHelper } from '@/core/helpers/request-context.helper'
// Validation
import { Joi, validate } from '@/core/helpers/validator.helper'
// Utils
import { merge, mergeOptions, pick, snooze } from '@/core/utils/common.util'
import { deepSanitize, isDangerousKey } from '@/core/utils/security.util'
import { isEmpty, isNil, isObject } from '@/core/utils/type-check.util'

// ===== FRAMEWORK LAYER =====
// App Factory
import { createApp } from '@/framework/express.loader'
// API
import {
  PaginatedResponse,
  stdGetListQueryParams,
} from '@/framework/helpers/api.helper'
// Caching
import { delCache, getCache, setCache } from '@/framework/helpers/cache.helper'
// Date
import dayjs, { DEFAULT_TIMEZONE } from '@/framework/helpers/dayjs.helper'
// --- Helpers ---
// i18n
import {
  changeLanguage,
  exists,
  initI18n,
  t,
} from '@/framework/helpers/i18n.helper'
// MongoDB
import {
  connectMongoDB,
  disconnectMongoDB,
  isMongoIdDto,
  isSameObjectId,
  isValidObjectIdString,
  makeObjectId,
  toMongoIdDto,
} from '@/framework/helpers/mongodb.helper'
// Redis
import {
  connectRedis,
  disconnectRedis,
  getClient as getRedisClient,
} from '@/framework/helpers/redis.helper'
// --- Middleware ---
import { i18nMiddleware } from '@/framework/middleware/localize.middleware'
import { requestContext } from '@/framework/middleware/request-context.middleware'
import { requestValidator } from '@/framework/middleware/request-validator.middleware'
import { wrapController } from '@/framework/middleware/wrap-controller.middleware'
// Graceful Shutdown
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

**Cache-Aside Pattern**:

```js
router.get(
  '/',
  wrapController(async req => {
    // 1. Try cache first
    const cache = await getCache({
      model: 'post',
      alias: 'post-list',
      queryParams: req.query,
    })

    if (cache.success && cache.data) {
      return new PaginatedResponse(cache.data.list, {
        ...req.query,
        total: cache.data.total,
      })
    }

    // 2. Cache miss → fetch from DB
    const { list, total } = await postService.getList(req.query)

    // 3. Set cache
    await setCache({
      model: 'post',
      alias: 'post-list',
      queryParams: req.query,
      data: { list, total },
      expire: 60,
    })

    return new PaginatedResponse(list, { ...req.query, total })
  })
)
```

**i18n Translation Pattern**:

```js
router.post(
  '/',
  wrapController(async req => {
    const user = await userService.create(req.body)

    return new HttpResponse(
      201,
      user,
      req.t('user.created', { name: user.name }) // Translated message
    )
  })
)

// In error handling
if (!user) {
  throw new NotFoundError(req.t('user.notFound', { id: req.params.id }))
}
```

**MongoDB ObjectId Validation**:

```js
const schema = {
  params: Joi.object({
    id: Joi.string().custom(toMongoIdDto).required(), // Validate & transform
  }).unknown(true),
}

router.get(
  '/:id',
  requestValidator(schema),
  wrapController(async req => {
    // req.params.id is now ObjectId instance
    const user = await User.findById(req.params.id)
    if (!user) throw new NotFoundError('User', req.params.id)
    return user
  })
)
```

**Complete CRUD with Cache Example**:

```js
import { Router } from 'express'

import {
  HTTP_STATUS,
  HttpResponse,
  PaginatedResponse,
  delCache,
  getCache,
  requestValidator,
  setCache,
  wrapController,
} from '@/framework/...'

const router = Router()

// LIST with cache
router.get(
  '/',
  requestValidator(getListDto),
  wrapController(async req => {
    const cache = await getCache({
      model: 'post',
      alias: 'list',
      queryParams: req.query,
    })
    if (cache.success && cache.data) {
      return new PaginatedResponse(cache.data.list, {
        ...req.query,
        total: cache.data.total,
      })
    }

    const { list, total } = await postService.getList(req.query)
    await setCache({
      model: 'post',
      alias: 'list',
      queryParams: req.query,
      data: { list, total },
      expire: 60,
    })

    return new PaginatedResponse(list, { ...req.query, total })
  })
)

// CREATE with cache invalidation
router.post(
  '/',
  requestValidator(createDto),
  wrapController(async req => {
    const post = await postService.create(req.body)

    // Invalidate list cache
    await delCache({ model: 'post', alias: 'list' })

    return new HttpResponse(HTTP_STATUS.CREATED, post, req.t('post.created'))
  })
)

// UPDATE with cache invalidation
router.patch(
  '/:id',
  requestValidator(updateDto),
  wrapController(async req => {
    const post = await postService.update(req.params.id, req.body)

    // Invalidate both detail and list cache
    await delCache({
      model: 'post',
      alias: 'detail',
      queryParams: { id: req.params.id },
    })
    await delCache({ model: 'post', alias: 'list' })

    return new HttpResponse(HTTP_STATUS.OK, post, req.t('post.updated'))
  })
)

export default router
```

---

**End of Architecture Overview**
