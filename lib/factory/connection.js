async function connectionFactory () {
  const { Tools } = this.app.baseClass
  const { omit } = this.app.lib._

  /**
   * Connection class
   *
   * @class
   */
  class DoboConnection extends Tools {
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
      this.options = {
        models: []
      }

      /**
       * Options object from connection defined on ```dobo.config.connections```
       *
       * @type {Object}
       */
      if (options instanceof this.app.baseClass.DoboNullDriver) {
        this.driver = options
        this.options.connName = 'nulldriver'
      } else {
        this.options = omit(options, ['name', 'driver'])
        this.options.connName = options.name
        this.options.models = this.options.models ?? []
      }
    }

    /**
     * Init driver. Called automatically during connections collection
     *
     * @param {strin} name - Driver name
     * @async
     */
    async initDriver (name) {
      if (name instanceof this.app.baseClass.DoboDriver) this.driver = name
      else {
        this.driver = this.plugin.getDriver(name)
        await this.driver.sanitizeConnection(this.options)
      }
    }

    /**
     * Establish this connection through the driver to the actual database system. Driver developer must
     * provide a method named ```connect()``` to connect the underlying database and (optionally) return its client instance.
     *
     * @param {boolean} [noRebuild] - If ```true```, the database table/collection won't be build automatically
     */
    async connect (noRebuild) {
      const client = await this.driver.connect(this, noRebuild)
      if (client) this.client = client
      this.connected = true
    }

    dispose = async () => {
      await super.dispose()
      this.driver = null
    }
  }

  this.app.baseClass.DoboConnection = DoboConnection
}

export default connectionFactory
