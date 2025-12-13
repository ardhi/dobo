export const idField = {
  name: '_id',
  type: 'string',
  maxLength: 50,
  required: true,
  index: { type: 'primary' }
}

export async function driverFactory () {
  const { Tools } = this.app.lib

  /**
   * Driver class
   *
   * ```this.plugin``` should be the one who owned this driver
   *
   * @class
   */
  class Driver extends Tools {
    constructor (plugin) {
      super(plugin)
      this.idField = idField
    }

    init = async ({ connection, schemas, noRebuild }) => {}
    /**
     * Sanitize connection info
     *
     * @method
     * @param {Object} input
     * @returns {Object} Sanitized connection object
     */
    sanitizeConnectionInfo = async (input) => {
      return input
    }

    sanitizeSchema = async (schema) => {
    }

    buildSchema = async (schema) => {
    }
  }

  return Driver
}
