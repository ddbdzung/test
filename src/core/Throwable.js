/**
 * @interface
 */
export class Throwable {
  /**
   * Serialize to JSON object format (for error/API response)
   * @returns {Object} Throwable object with all properties serialized
   */
  toJSON() {}
}
