/**
 * Feature factory function.
 *
 * @async
 * @returns {Promise<void>}
 */

async function featureFactory () {
  const { Tools } = this.app.baseClass

  /**
   * Feature class definition.
   *
   * `this.plugin` should be the one who owned this adapter
   * @class
   */
  class DoboFeature extends Tools {
    /**
     * Constructor.
     */
    constructor (plugin, options = {}) {
      super(plugin)
      /**
       * Feature name
       * @type {string}
       */
      this.name = options.name

      /**
       * Feature handler function.
       * @type {Function}
       */
      this.handler = options.handler
    }

    /**
     * Dispose the instance and clean up resources.
     * @async
     * @method
     * @returns {Promise<void>}
     */
    dispose = async () => {
      await super.dispose()
      this.name = null
      this.handler = null
    }
  }

  this.app.baseClass.DoboFeature = DoboFeature
}

export default featureFactory
