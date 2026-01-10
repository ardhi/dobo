const methods = {
  createRecord: ['body'],
  updateRecord: ['id', 'body'],
  upsertRecord: ['body'],
  removeRecord: ['id'],
  getRecord: ['id'],
  findRecord: ['filter'],
  findOneRecord: ['filter'],
  findAllRecord: ['filter'],
  findAllRecords: ['filter'],
  countRecord: ['params'],
  createAggregate: ['params'],
  createHistogram: ['params'],
  createAttachment: ['id'],
  findAttachment: ['id'],
  getAttachment: ['id', 'fieldName', 'file'],
  listAttachment: ['params'],
  removeAttachment: ['id', 'fieldName', 'file'],
  updateAttachment: ['id']
}

const options = {
  truncateString: true,
  noResult: true,
  noBodySanitizer: true,
  noResultSanitizer: true,
  noValidation: true,
  dataOnly: true,
  noHook: true,
  noModelHook: true,
  extFields: [],
  fields: [],
  noFlash: true,
  hidden: [],
  refs: [],
  types: [],
  type: undefined,
  group: undefined,
  aggregates: [],
  field: undefined,
  queryHandler: undefined,
  count: true,
  noCache: true,
  partial: true,
  // attachment
  mimeType: true,
  fullPath: true,
  stats: true,
  dirOnly: true,
  setField: undefined,
  setFile: undefined,
  source: undefined,
  uriEncoded: true
}

async function actionFactory () {
  const { Tools } = this.app.baseClass

  /**
   * Action class enables you to call model's method with all parameters and options in chainable methods
   * in addition of the normall call. Examples:
   *
   * ```javascript
   * // method 1:
   * const result = await model.action().getRecord('rec-id').noHook().dataOnly(false).run()
   * // method 2:
   * const result = await model.action('getRecord').id('rec-id').noHook().dataOnly(false).run()
   * // method 3:
   * const result = await model.action('getRecord', 'rec-id').noHook().dataOnly(false).run()
   * // method 4:
   * const action = await model.getRecord() // Important: no parameter passed
   * const result = action.id('rec-id').noHook().dataOnly(false).run()
   * // Instead of chaining options as methods, you can also pass options object to the run() method
   * const result = await model.action('getRecord', 'rec-id').run({ noHook: true, dataOnly: false })
   * ```
   *
   * @class
   */
  class DoboAction extends Tools {
    constructor (model, name, ...args) {
      super(model.plugin)
      this.model = model
      this.name = name
      this._options = {}
      if (name) this._setArgs(name, args)
      // create methods
      for (const method in methods) {
        this[method] = (...args) => {
          this.name = method
          this._setArgs(method, args)
          this._options = {}
          return this
        }
      }
      // create options builder methods
      for (const option in options) {
        this[option] = (value) => {
          this._options[option] = value ?? options[option]
          return this
        }
      }
    }

    _setArgs = (method, args) => {
      if (args.length === 0) return
      for (const idx in methods[method]) {
        this['_' + methods[method][idx]] = args[idx]
      }
    }

    id = value => {
      this._id = value
      return this
    }

    body = value => {
      this._body = value
      return this
    }

    filter = value => {
      this._filter = value
      return this
    }

    fieldName = value => {
      this._fieldName = value
      return this
    }

    file = value => {
      this._file = value
      return this
    }

    options = (value = {}) => {
      for (const k in value) {
        this._options[k] = value
      }
      return this
    }

    run = async (value = {}) => {
      this.options(value)
      const args = methods[this.name].map(item => this['_' + item])
      args.push(this._options)
      return await this.model[this.name](...args)
    }

    dispose () {
      super.dispose()
      this.model = null
      this._options = null
    }
  }

  this.app.baseClass.DoboAction = DoboAction
  return DoboAction
}

export default actionFactory
