# Architecture Overview

> Tài liệu tổng hợp kiến trúc và patterns của ExpressJS CRUD project
>
> **Author:** Dang Duc B. Dzung (David)  
> **Last Updated:** October 16, 2025

---

## 📋 Table of Contents

- [1. Tổng quan dự án](#1-tổng-quan-dự-án)
- [2. Kiến trúc Layered Architecture](#2-kiến-trúc-layered-architecture)
- [3. Core Layer](#3-core-layer)
- [4. Framework Layer](#4-framework-layer)
- [5. Configuration System](#5-configuration-system)
- [6. Error Handling Strategy](#6-error-handling-strategy)
- [7. Request Context Management](#7-request-context-management)
- [8. Validation & Security](#8-validation--security)
- [9. Build & Development Workflow](#9-build--development-workflow)
- [10. Best Practices & Patterns](#10-best-practices--patterns)

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
├── bootstrap.js              # Application entry point
├── configs/                  # Configuration layer
│   ├── env-schema.js        # Environment validation (Joi)
│   └── app.config.js        # Application config (merged by env)
├── core/                     # Core cross-cutting concerns
│   ├── constants/           # Constants (HTTP status, log levels)
│   ├── helpers/             # Helpers (error, logger, validator)
│   ├── utils/               # Utilities (common, security, type-check)
│   └── Throwable.js         # Interface for error/response objects
├── framework/               # Express-specific layer
│   ├── helpers/            # Framework helpers (request-context)
│   └── middleware/         # Express middleware
│       ├── request-context.middleware.js
│       ├── request-logger.middleware.js
│       ├── request-validator.middleware.js
│       ├── security-header.middleware.js
│       ├── error-handler.middleware.js
│       └── wrap-controller.middleware.js
└── modules/                 # Business modules (empty, ready for expansion)
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
LOG_LEVEL // debug, info, warn, error, verbose, http
TIMEOUT_CONTROLLER // DEFAULT, HEAVY_PROCESS, ENQUEUE_PROCESS
REQUEST_ID_KEY // 'X-Request-Id'
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

### 4.1. Middleware Pipeline

```js
// Typical middleware order in bootstrap.js:
app.use(express.json())                    // Body parser
app.use(securityHeaders)                   // Security headers
app.use(requestContext({ ... }))           // AsyncLocalStorage context
app.use(requestLogger)                     // Morgan + Winston logging
app.post('/path',
  requestValidator(schema, options),       // Joi validation
  wrapController(controllerFn)             // Error handling wrapper
)
app.use(errorHandler)                      // Global error handler
```

### 4.2. request-context.middleware.js

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
  startTime: 1697456789000,
  userId: 123,              // From extractUserId
  tenantId: 456             // From extractMetadata
}
```

**Usage in code**:

```js
import { requestContextHelper } from '@/framework/helpers/request-context.helper'

const ctx = requestContextHelper.getContext()
const requestId = requestContextHelper.getContextValue('requestId')
requestContextHelper.setContextValue('key', value)
```

### 4.3. request-validator.middleware.js

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

### 4.4. request-logger.middleware.js

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

### 4.5. security-header.middleware.js

**Purpose**: Set security headers to protect against common attacks.

```js
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'none'
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(), microphone=(), fullscreen=(self)
```

**TODO**: Add `Strict-Transport-Security` when HTTPS is enabled.

### 4.6. wrap-controller.middleware.js

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

### 4.7. error-handler.middleware.js

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

---

## 5. Configuration System

### 5.1. Environment Variables Validation

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

### 5.2. Application Configuration

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

### 5.3. Configuration Philosophy

**Two-Step Approach**:

1. **env-schema.js**: Validation-first (Joi schema, fail-fast)
2. **app.config.js**: Structure & merge (environment-based, organized)

**Benefits**:

- Type-safe environment variables
- Fail-fast on missing/invalid config
- Environment-specific overrides
- Single source of truth

---

## 6. Error Handling Strategy

### 6.1. Error Classification

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

### 6.2. Error Context & Chaining

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

### 6.3. Error Response Format

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

### 6.4. Error Handling Best Practices

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

## 7. Request Context Management

### 7.1. AsyncLocalStorage Pattern

**Problem**: Track request-specific data (requestId, userId) across async operations without passing through every function.

**Solution**: AsyncLocalStorage (Node.js native API)

```js
// Access anywhere in request lifecycle
import { requestContextHelper } from '@/framework/helpers/request-context.helper'

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

### 7.2. Context Structure

```js
{
  requestId: 'req_1697456789_abc123',  // Unique request ID
  method: 'POST',
  url: '/api/users',
  path: '/api/users',
  ip: '127.0.0.1',
  userAgent: 'Mozilla/5.0...',
  startTime: 1697456789000,
  userId: 123,                         // Custom extracted
  tenantId: 456                        // Custom metadata
}
```

### 7.3. Context Usage Patterns

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

### 7.4. Security Considerations

- Dangerous keys (`__proto__`, `constructor`, `prototype`) are blocked
- Context is isolated per request (no cross-contamination)
- Circular reference detection in deep sanitization

---

## 8. Validation & Security

### 8.1. Prototype Pollution Protection

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

### 8.2. Joi Schema Patterns

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

### 8.3. Security Headers

```js
X-Content-Type-Options: nosniff           // Prevent MIME sniffing
X-Frame-Options: DENY                     // Prevent clickjacking
X-XSS-Protection: 1; mode=block          // XSS filter
Content-Security-Policy: default-src 'none'  // CSP
Referrer-Policy: no-referrer             // No referrer leakage
Permissions-Policy: geolocation=()        // Feature policy
```

### 8.4. Input Sanitization Pipeline

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

## 9. Build & Development Workflow

### 9.1. Scripts Overview

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

### 9.2. Development Workflow

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

### 9.3. Build Process

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

### 9.4. Babel Configuration

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

### 9.5. ESLint Configuration

**Plugins**:

- `@eslint/js` - Recommended rules
- `eslint-plugin-import` - Import/export validation
- `eslint-plugin-security` - Security checks
- `eslint-plugin-jest` - Jest rules

**Key Rules**:

- `no-undef`, `no-unused-vars` - Code quality
- `import/no-unresolved`, `import/no-cycle` - Import checks
- `security/detect-object-injection` - Security warnings

### 9.6. Git Workflow

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

## 10. Best Practices & Patterns

### 10.1. Error Handling

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

### 10.2. Validation

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

### 10.3. Logging

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

### 10.4. Controller Design

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

### 10.5. Configuration

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

### 10.6. Middleware Order

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

### 10.7. Async/Await Patterns

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

### 10.8. Security

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

### 10.9. Testing

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

### 10.10. Code Organization

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
// Context
import { requestContextHelper } from '@/framework/helpers/request-context.helper'
// Middleware
import { requestValidator } from '@/framework/middleware/request-validator.middleware'
import { wrapController } from '@/framework/middleware/wrap-controller.middleware'
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
```

### Common Patterns

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
