import { Kafka } from 'kafkajs'

import { logger } from '@/core/helpers'

import { KAFKA_CONFIG, PRODUCER_CONFIG } from './kafka.config'

class KafkaProducerService {
  constructor() {
    this.kafka = new Kafka(KAFKA_CONFIG)
    this.producer = this.kafka.producer(PRODUCER_CONFIG)
    this.isConnected = false
    this.connectionPromise = null
  }

  /**
   * Connect to Kafka producer
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.isConnected) {
      return
    }

    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = this._doConnect()
    return this.connectionPromise
  }

  /**
   * Internal connection method
   * @private
   */
  async _doConnect() {
    try {
      await this.producer.connect()
      this.isConnected = true
      this.connectionPromise = null
      logger.info('Kafka Producer connected successfully')
    } catch (error) {
      this.connectionPromise = null
      logger.error('Failed to connect Kafka Producer:', error)
      throw new Error(`Kafka Producer connection failed: ${error.message}`)
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
      await this.connect()

      const message = {
        value: typeof data === 'object' ? JSON.stringify(data) : data,
        ...options,
      }

      const result = await this.producer.send({
        topic,
        messages: [message],
      })

      logger.debug('Message sent successfully', {
        topic,
        messageId: result[0]?.recordMetadata,
      })
      return result
    } catch (error) {
      logger.error('Failed to send Kafka message:', {
        topic,
        error: error.message,
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
      await this.connect()

      const formattedMessages = messages.map(data => ({
        value: typeof data === 'object' ? JSON.stringify(data) : data,
      }))

      const result = await this.producer.send({
        topic,
        messages: formattedMessages,
      })

      logger.debug('Batch messages sent successfully', {
        topic,
        count: messages.length,
      })
      return result
    } catch (error) {
      logger.error('Failed to send batch Kafka messages:', {
        topic,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Disconnect from Kafka producer
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isConnected) {
      return
    }

    try {
      await this.producer.disconnect()
      this.isConnected = false
      logger.info('Kafka Producer disconnected successfully')
    } catch (error) {
      logger.error('Failed to disconnect Kafka Producer:', error)
      throw error
    }
  }
}

// Export singleton instance
export const kafkaProducer = new KafkaProducerService()
export default kafkaProducer
