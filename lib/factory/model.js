async function modelFactory () {
  const { Tools } = this.app.lib
  /**
   * Model class
   *
   * ```this.plugin``` should be the one who owned this driver
   *
   * @class
   */
  class Model extends Tools {
    constructor (plugin, name) {
      super(plugin)
      const schema = this.app.dobo.getSchema(name)
      if (!schema) throw this.error('unknown%s%s', this.plugin.t('schema'), name)
    }
  }

  return Model
}

export default modelFactory
