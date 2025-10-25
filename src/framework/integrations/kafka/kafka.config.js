import { kafka, service } from '@/configs'

import { CURRENT_ENV, ENVIRONMENT } from '@/core/constants'

const isProduction = CURRENT_ENV === ENVIRONMENT.PRODUCTION

// Kafka connection configuration
export const KAFKA_CONFIG = {
  clientId: kafka.clientId,
  brokers: kafka.brokers,
  ...(isProduction
    ? {
        sasl: {
          mechanism: kafka.mechanism,
          username: kafka.username,
          password: kafka.password,
        },
      }
    : {}),
}

// Topic definitions
export const KAFKA_TOPICS = {
  DASHBOARD_LOG: 'DASHBOARD.LOG',
  PROMOTION_COUPON_EVENT: 'PROMOTION_COUPON_EVENT',
}

// Consumer configuration
export const CONSUMER_CONFIG = {
  groupId: isProduction ? service : `${service}-dev`,
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 1048576,
  minBytes: 1,
  maxBytes: 10485760,
  maxWaitTimeInMs: 5000,
}

// Producer configuration
export const PRODUCER_CONFIG = {
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
}

// Cache configuration
export const CACHE_CONFIG = {
  BIZ_COUNT_EXPIRE: 60, // 1 minute
  BIZ_EXPIRE: 300, // 5 minutes
}

// Queue configuration
export const QUEUE_CONFIG = {
  RETRY_DELAY_SECONDS: 15,
  MAX_RETRIES: 3,
  PRIORITY: {
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  },
}
