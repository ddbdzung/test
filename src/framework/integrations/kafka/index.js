import { logger } from '@/core/helpers'

import kafkaConsumer from './kafka-consumer.service'
import kafkaProducer from './kafka-producer.service'
import { KAFKA_TOPICS } from './kafka.config'

/**
 * Kafka Service - Main interface for Kafka operations
 */
class KafkaService {
  constructor() {
    this.producer = kafkaProducer
    this.consumer = kafkaConsumer
    this.topics = KAFKA_TOPICS
    this.isInitialized = false
  }

  /**
   * Initialize Kafka service (start consumer)
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Kafka service already initialized')
      return
    }

    try {
      logger.info('Initializing Kafka service...')

      // Start consumer
      await this.consumer.start()

      this.isInitialized = true
      logger.info('Kafka service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Kafka service:', error)
      throw error
    }
  }

  /**
   * Send message to Kafka topic
   * @param {string} topic - Topic name
   * @param {Object|string} data - Message data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>}
   */
  async sendMessage(topic, data, options = {}) {
    try {
      return await this.producer.sendMessage(topic, data, options)
    } catch (error) {
      logger.error('Failed to send message via Kafka service:', {
        topic,
        error,
      })
      throw error
    }
  }

  /**
   * Send multiple messages to Kafka topic
   * @param {string} topic - Topic name
   * @param {Array} messages - Array of messages
   * @returns {Promise<Object>}
   */
  async sendMessages(topic, messages) {
    try {
      return await this.producer.sendMessages(topic, messages)
    } catch (error) {
      logger.error('Failed to send batch messages via Kafka service:', {
        topic,
        error,
      })
      throw error
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      producer: {
        isConnected: this.producer.isConnected,
      },
      consumer: this.consumer.getMetrics(),
      topics: this.topics,
    }
  }

  /**
   * Shutdown Kafka service
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (!this.isInitialized) {
      logger.warn('Kafka service not initialized, skipping shutdown')
      return
    }

    try {
      logger.info('Shutting down Kafka service...')

      // Stop consumer and producer
      await Promise.all([this.consumer.stop(), this.producer.disconnect()])

      this.isInitialized = false
      logger.info('Kafka service shutdown successfully')
    } catch (error) {
      logger.error('Failed to shutdown Kafka service:', error)
      throw error
    }
  }
}

// Export singleton instance
export const kafkaService = new KafkaService()

// Export individual services for direct access if needed
export { KAFKA_TOPICS } from './kafka.config'
export { kafkaConsumer, kafkaProducer }

// Export the main service as default
export default kafkaService

// Auto-initialize when imported (matching original behavior)
kafkaService.initialize().catch(error => {
  logger.error('Failed to auto-initialize Kafka service on import:', error)
})
