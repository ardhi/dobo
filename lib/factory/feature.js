async function featureFactory () {
  const { Tools } = this.app.baseClass

  /**
   * Feature class
   *
   * ```this.plugin``` should be the one who owned this driver
   * @class
   */
  class DoboFeature extends Tools {
    constructor (plugin, options = {}) {
      super(plugin)
      /**
       * Feature name
       *
       * @type {string}
       */
      this.name = options.name
      this.handler = options.handler
    }

    dispose () {
      super.dispose()
      this.name = null
      this.handler = null
    }
  }

  this.app.baseClass.DoboFeature = DoboFeature
  return DoboFeature
}

export default featureFactory
