async function connectionFactory () {
  const { Tools } = this.app.lib
  const { defaults } = this.app.lib._

  /**
   * Connection class
   *
   * @class
   */
  class Connection extends Tools {
    constructor (plugin, options) {
      super(plugin)
      /**
       * Client instance
       *
       * @type {Object}
       */
      this.client = null
      defaults(this, options)
      this.schemas = this.schemas ?? []
    }
  }

  return Connection
}

export default connectionFactory
