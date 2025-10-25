import { Kafka } from 'kafkajs'

import { logger } from '@/core/helpers'

import { CONSUMER_CONFIG, KAFKA_CONFIG, KAFKA_TOPICS } from './kafka.config'

class KafkaConsumerService {
  constructor() {
    this.kafka = new Kafka(KAFKA_CONFIG)
    this.consumer = this.kafka.consumer(CONSUMER_CONFIG)
    this.isConnected = false
    this.messageHandlers = this.initializeMessageHandlers()
  }

  /**
   * Initialize message handlers mapping
   * @returns {Object} Topic to handler mapping
   */
  initializeMessageHandlers() {
    return {
      // [KAFKA_TOPICS.PROMOTION_LOG]: promotionLogHandler,
    }
  }

  /**
   * Connect to Kafka consumer
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.isConnected) {
      return
    }

    try {
      await this.consumer.connect()
      this.isConnected = true
      logger.info('Kafka Consumer connected successfully')
    } catch (error) {
      logger.error('Failed to connect Kafka Consumer:', error)
      throw new Error(`Kafka Consumer connection failed: ${error.message}`)
    }
  }

  /**
   * Subscribe to Kafka topics
   * @returns {Promise<void>}
   */
  async subscribe() {
    try {
      await this.consumer.subscribe({
        topics: Object.values(KAFKA_TOPICS),
        fromBeginning: true,
      })

      logger.info('Subscribed to Kafka topics successfully', {
        topics: Object.values(KAFKA_TOPICS),
      })
    } catch (error) {
      logger.error('Failed to subscribe to Kafka topics:', error)
      throw error
    }
  }

  /**
   * Start consuming messages
   * @returns {Promise<void>}
   */
  async startConsuming() {
    try {
      await this.consumer.run({
        eachMessage: async ({
          topic,
          partition,
          message,
          heartbeat,
          pause,
        }) => {
          await this.processMessage(topic, partition, message, heartbeat, pause)
        },
      })

      logger.info('Kafka Consumer started successfully')
    } catch (error) {
      logger.error('Failed to start Kafka Consumer:', error)
      throw error
    }
  }

  /**
   * Process individual message
   * @param {string} topic - Topic name
   * @param {number} partition - Partition number
   * @param {Object} message - Kafka message
   * @param {Function} heartbeat - Heartbeat function
   * @param {Function} pause - Pause function
   */
  async processMessage(topic, partition, message, heartbeat, pause) {
    const messageContext = {
      topic,
      partition,
      offset: message.offset,
      timestamp: message.timestamp,
    }

    try {
      // Send heartbeat to keep consumer alive
      await heartbeat()

      // Log message reception
      logger.debug('Received Kafka message', {
        ...messageContext,
        valuePreview: message.value?.toString().substring(0, 100),
      })

      // Get handler for topic
      const handler = this.messageHandlers[topic]
      if (!handler) {
        return
      }

      // Process message with handler
      await handler.handle(message, messageContext)

      // Send heartbeat after processing
      await heartbeat()
    } catch (error) {
      logger.error('Error processing Kafka message', {
        ...messageContext,
        error: error.message,
        stack: error.stack,
      })

      // Handle different types of errors
      await this.handleProcessingError(error, messageContext, pause)
    }
  }

  /**
   * Handle processing errors
   * @param {Error} error - The error that occurred
   * @param {Object} messageContext - Message context
   * @param {Function} pause - Pause function
   */
  async handleProcessingError(error, messageContext, pause) {
    // For now, just log the error
    // In production, you might want to:
    // 1. Send to dead letter queue
    // 2. Implement retry logic
    // 3. Alert monitoring systems
    // 4. Pause consumer if too many errors

    logger.error('Message processing error details', {
      topic: messageContext.topic,
      partition: messageContext.partition,
      offset: messageContext.offset,
      error: error.message,
      errorType: error.constructor.name,
    })

    // Example of pausing on critical errors
    if (
      error.message.includes('Database connection') ||
      error.message.includes('Critical')
    ) {
      logger.warn('Pausing consumer due to critical error', {
        topic: messageContext.topic,
        error: error.message,
      })

      // Pause for 30 seconds
      pause()
      setTimeout(() => {
        // Consumer will automatically resume
        logger.info('Resuming consumer after pause', {
          topic: messageContext.topic,
        })
      }, 30000)
    }
  }

  /**
   * Start the consumer (connect, subscribe, and start consuming)
   * @returns {Promise<void>}
   */
  async start() {
    try {
      await this.connect()
      await this.subscribe()
      await this.startConsuming()
    } catch (error) {
      logger.error('Failed to start Kafka Consumer Service:', error)
      throw error
    }
  }

  /**
   * Stop the consumer
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.isConnected) {
      return
    }

    try {
      await this.consumer.disconnect()
      this.isConnected = false
      logger.info('Kafka Consumer stopped successfully')
    } catch (error) {
      logger.error('Failed to stop Kafka Consumer:', error)
      throw error
    }
  }

  /**
   * Get consumer metrics
   * @returns {Object} Consumer metrics
   */
  getMetrics() {
    return {
      isConnected: this.isConnected,
      subscribedTopics: Object.values(KAFKA_TOPICS),
      handlersCount: Object.keys(this.messageHandlers).length,
      consumerGroupId: CONSUMER_CONFIG.groupId,
    }
  }
}

// Export singleton instance
export const kafkaConsumer = new KafkaConsumerService()
export default kafkaConsumer
