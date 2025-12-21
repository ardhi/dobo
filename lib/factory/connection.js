async function connectionFactory () {
  const { Tools } = this.app.baseClass
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
      this.driver = undefined
      defaults(this, options)
      this.models = this.models ?? []
    }

    /**
     * Dispose internal references
     */
    dispose = () => {
      super.dispose()
      this.driver = null
    }
  }

  return Connection
}

export default connectionFactory
