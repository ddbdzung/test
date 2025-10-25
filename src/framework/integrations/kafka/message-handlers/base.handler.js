import { logger } from '@/core/helpers'

/**
 * Base class for Kafka message handlers
 */
export class BaseMessageHandler {
  constructor(handlerName) {
    this.handlerName = handlerName
  }

  /**
   * Handle message with error handling and logging
   * @param {Object} message - Kafka message
   * @param {Object} context - Additional context
   * @returns {Promise<void>}
   */
  async handle(message, context = {}) {
    const startTime = Date.now()

    try {
      logger.debug(`[${this.handlerName}] Processing message`, {
        topic: context.topic,
        partition: context.partition,
        messageLength: message.value?.length || 0,
      })

      // Validate message
      await this.validateMessage(message)

      // Parse message
      const parsedMessage = await this.parseMessage(message)

      // Process message
      const result = await this.processMessage(parsedMessage, context)

      const processingTime = Date.now() - startTime
      logger.info(`[${this.handlerName}] Message processed successfully`, {
        topic: context.topic,
        processingTime,
      })

      return result
    } catch (error) {
      const processingTime = Date.now() - startTime
      logger.error(`[${this.handlerName}] Message processing failed`, {
        topic: context.topic,
        processingTime,
        error: error.message,
      })

      // Handle error based on type
      await this.handleError(error, message, context)
      throw error
    }
  }

  /**
   * Validate incoming message
   * @param {Object} message - Kafka message
   * @throws {Error} If message is invalid
   */
  async validateMessage(message) {
    if (!message || !message.value) {
      throw new Error('Invalid message: missing value')
    }
  }

  /**
   * Parse message value
   * @param {Object} message - Kafka message
   * @returns {Object} Parsed message
   */
  async parseMessage(message) {
    try {
      return JSON.parse(message.value.toString())
    } catch (error) {
      throw new Error(`Invalid JSON message: ${error.message}`)
    }
  }

  /**
   * Process the parsed message - must be implemented by subclasses
   * @param {Object} parsedMessage - Parsed message data
   * @param {Object} context - Additional context
   * @returns {Promise<any>}
   */
  async processMessage(parsedMessage, context) {
    throw new Error('processMessage must be implemented by subclass')
  }

  /**
   * Handle errors that occur during message processing
   * @param {Error} error - The error that occurred
   * @param {Object} message - Original message
   * @param {Object} context - Additional context
   */
  async handleError(error, message, context) {
    // Default error handling - can be overridden by subclasses
    logger.error(`[${this.handlerName}] Error details`, {
      error: error.message,
      stack: error.stack,
      messagePreview: message.value?.toString().substring(0, 100),
      context,
    })
  }

  /**
   * Utility method to safely extract required fields from message
   * @param {Object} message - Parsed message
   * @param {Array<string>} requiredFields - Required field names
   * @throws {Error} If required fields are missing
   */
  validateRequiredFields(message, requiredFields) {
    const missingFields = requiredFields.filter(field => !message[field])
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
    }
  }
}
