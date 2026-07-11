/**
 * @typedef TOptions
 * @memberof DoboConnection
 * @property {string} [name='default'] - Connection name
 * @property {string[]} models - List of model names to be used with this connection. Use this property to force models to be bound to this connection only.
 */

/**
 * Connection factory
 *
 * @async
 */
async function connectionFactory () {
  const { Tools } = this.app.baseClass
  const { omit } = this.app.lib._

  /**
   * Connection class definition.
   *
   * @class
   */
  class DoboConnection extends Tools {
    constructor (plugin, options = {}) {
      super(plugin)
      /**
       * Adapter object
       * @type {Object}
       */
      this.adapter = undefined

      /**
       * Client instance
       * @type {Object}
       */
      this.client = undefined

      /**
       * Connection name
       * @type {string}
       */
      this.name = options.name

      /**
       * Connection options
       * @type {DoboConnection.TOptions}
       */
      this.options = {
        models: []
      }

      /**
       * Options object from connection defined on ```dobo.config.connections```
       * @type {Object}
       */
      if (options instanceof this.app.baseClass.DoboNullAdapter) {
        this.adapter = options
        this.options.connName = 'nulladapter'
      } else {
        this.options = omit(options, ['name', 'adapter'])
        this.options.connName = options.name
        this.options.models = this.options.models ?? []
      }
    }

    /**
     * Initialize the adapter for this connection. If the adapter is already an instance of `DoboAdapter`,
     * it will be used directly. Otherwise, it will be retrieved from the plugin's adapter registry
     * and sanitized with the connection options.
     * @param {string} name - Adapter name
     * @async
     * @returns {Promise<void>}
     */
    async initAdapter (name) {
      if (name instanceof this.app.baseClass.DoboAdapter) this.adapter = name
      else {
        this.adapter = this.plugin.getAdapter(name)
        await this.adapter.sanitizeConnection(this.options)
      }
    }

    /**
     * Establish this connection through the adapter to the actual database system. Adapter developer must
     * provide a method named `connect()` to connect the underlying database and (optionally)
     * return its client instance.
     *
     * @param {boolean} [noRebuild] - If `true`, the database table/collection won't be build automatically
     * @retyrns {Promise<void>}
     */
    async connect (noRebuild) {
      const client = await this.adapter.connect(this, noRebuild)
      if (client) this.client = client
      this.connected = true
    }

    /**
     * Dispose this connection
     * @async
     * @returns {Promise<void>}
     */
    dispose = async () => {
      await super.dispose()
      this.adapter = null
    }
  }

  this.app.baseClass.DoboConnection = DoboConnection
}

export default connectionFactory
