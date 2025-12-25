async function connectionFactory () {
  const { Tools } = this.app.baseClass
  const { omit } = this.app.lib._

  /**
   * Connection class
   *
   * @class
   */
  class Connection extends Tools {
    constructor (plugin, options = {}) {
      super(plugin)
      /**
       * Driver object
       *
       * @type {Object}
       */
      this.driver = undefined

      /**
       * Client instance
       */
      this.client = undefined

      /**
       * Connection name
       *
       * @type {string}
       */
      this.name = options.name

      /**
       * Is it memory type database connection? This options should be set by driver inside ```driver.sanitizeConnection```
       * and should NOT rely on user config
       */

      this.memory = options.memory ?? false

      /**
       * Options object from connection defined on ```dobo.config.connections```
       *
       * @type {Object}
       */
      this.options = omit(options, ['name', 'driver', 'memory'])
      this.options.models = this.options.models ?? []
    }

    /**
     * Establish this connection through the driver to the actual database system. Driver developer must
     * provide a method named ```createClient()``` as a way to create client connection
     *
     * @param {boolean} [noRebuild] - If ```true```, the database table/collection won't be build automatically
     */
    async connect (noRebuild) {
      const client = await this.driver.createClient(this, noRebuild)
      if (client) this.client = client
    }

    dispose () {
      super.dispose()
      this.driver = null
    }
  }

  return Connection
}

export default connectionFactory
