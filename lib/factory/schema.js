import { sanitizeAll, sanitizeRef } from '../collect-schemas.js'

async function schemaFactory () {
  const { Tools } = this.app.lib
  const { defaults } = this.app.lib._
  /**
   * Feature class
   *
   * ```this.plugin``` should be the one who owned this driver
   *
   * @class
   */
  class Schema extends Tools {
    constructor (plugin, options) {
      super(plugin)
      defaults(this, options)
      this.driver = this.connection.driver
    }

    sanitizeObjectDef = async (obj) => {
      await sanitizeAll.call(this.app.dobo, obj)
    }

    sanitizeRef = async (obj, fatal = true) => {
      await sanitizeRef.call(this.app.dobo, obj, this.app.dobo.schemas, fatal)
    }
  }

  return Schema
}

export default schemaFactory
