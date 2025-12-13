async function featureFactory () {
  const { Tools } = this.app.lib

  /**
   * Feature class
   *
   * ```this.plugin``` should be the one who owned this driver
   * @class
   */
  class Feature extends Tools {
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
  }

  return Feature
}

export default featureFactory
