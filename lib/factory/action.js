/**
 * Dobo model's chainable methods. Only the keys listed here are allowed to be called in chainable methods.
 * The values are the only allowed arguments for the corresponding chainable methods.
 * @typedef {Object} TMethods
 * @type {Object}
 * @memberof DoboAction
 * @property {string[]} [createRecord=['body']]
 * @property {string[]} [updateRecord=['id', 'body']]
 * @property {string[]} [upsertRecord=['body']]
 * @property {string[]} [removeRecord=['id']]
 * @property {string[]} [getRecord=['id']]
 * @property {string[]} [findRecord=['filter']]
 * @property {string[]} [findOneRecord=['filter']]
 * @property {string[]} [findAllRecord=['filter']]
 * @property {string[]} [findAllRecords=['filter']] - Alias of `findAllRecord`
 * @property {string[]} [countRecord=['params']]
 * @property {string[]} [createAggregate=['params']]
 * @property {string[]} [createHistogram=['params']]
 * @property {string[]} [createAttachment=['id']]
 * @property {string[]} [findAttachment=['id']]
 * @property {string[]} [getAttachment=['id', 'field', 'file']]
 * @property {string[]} [listAttachment=['params']]
 * @property {string[]} [removeAttachment=['id', 'field', 'file']]
 * @property {string[]} [updateAttachment=['id']]
 */
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
  getAttachment: ['id', 'field', 'file'],
  listAttachment: ['params'],
  removeAttachment: ['id', 'field', 'file'],
  updateAttachment: ['id']
}

/**
 * Allowed options for Dobo model's chainable methods. Only the keys listed here are allowed to be called
 * in chainable methods. The values are the default values for the corresponding options.
 * @typedef {Object} TOptions
 * @type {Object}
 * @memberof DoboAction
 * @property {boolean} [truncateString=true]
 * @property {boolean} [noResult=false]
 * @property {boolean} [noBodySanitizer=false]
 * @property {boolean} [noResultSanitizer=false]
 * @property {boolean} [noValidation=false]
 * @property {boolean} [dataOnly=true]
 * @property {boolean} [noHook=false]
 * @property {boolean} [noModelHook=false]
 * @property {boolean} [noDynHook=false]
 * @property {Array} [extFields=[]]
 * @property {Array} [fields=[]]
 * @property {boolean} [noFlash=false]
 * @property {Array} [hidden=[]]
 * @property {Array} [refs=[]]
 * @property {Array} [types=[]]
 * @property {string|undefined} [type=undefined]
 * @property {string|undefined} [group=undefined]
 * @property {Array} [aggregates=[]]
 * @property {string|undefined} [field=undefined]
 * @property {string|undefined} [queryHandler=undefined]
 * @property {boolean} [count=true]
 * @property {boolean} [noCache=true]
 * @property {boolean} [partial=true]
 * @property {boolean} [mimeType=true]
 * @property {boolean} [fullPath=true]
 * @property {boolean} [stats=true]
 * @property {boolean} [dirOnly=true]
 * @property {string|undefined} [setField=undefined]
 * @property {string|undefined} [setFile=undefined]
 * @property {string|undefined} [source=undefined]
 * @property {boolean} [uriEncoded=true]
 */
const options = {
  truncateString: true,
  noResult: false,
  noBodySanitizer: false,
  noResultSanitizer: false,
  noValidation: false,
  dataOnly: true,
  noHook: false,
  noModelHook: false,
  noDynHook: false,
  extFields: [],
  fields: [],
  noFlash: false,
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

/**
 * Action factory function
 *
 * @async
 * @returns {Promise<void>}
 */
async function actionFactory () {
  const { Tools } = this.app.baseClass

  /**
   * Action class enables you to call model's method with all parameters and options in chainable methods
   * in addition of the normal call.
   *
   * Action class is created by calling model method without any parameter.
   * The resulted class instance can be used to call model's method with all parameters and options
   * in chainable methods.
   *
   * Action class can also be created by calling `model.action()` method, with or without parameters.
   * Please see the example below:
   *
   * You always need to call the `run()` method as the last step. The `run()` method will return the result
   * of the model's method call.
   *
   * @class
   * @example
   * // method 1:
   * const action = await model.getRecord() // Important: no parameter passed
   * const result = action.id('rec-id').noHook().dataOnly(false).run()
   * // method 2:
   * const result = await model.action().getRecord('rec-id').noHook().dataOnly(false).run()
   * // method 3:
   * const result = await model.action('getRecord').id('rec-id').noHook().dataOnly(false).run()
   * // method 4:
   * const result = await model.action('getRecord', 'rec-id').noHook().dataOnly(false).run()
   * // Instead of chaining options as methods, you can also pass options object as the parameter to the run() method
   * const result = await model.action('getRecord', 'rec-id').run({ noHook: true, dataOnly: false })
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

    /**
     * Internal method to set the arguments to the instance properties based on the method name
     * and the arguments passed.
     * @internal
     * @method
     * @param {string} method - The name of the method being called
     * @param {Array} args - The arguments passed to the method
     * @returns {void}
     */
    _setArgs = (method, args) => {
      if (args.length === 0) return
      for (const idx in methods[method]) {
        this['_' + methods[method][idx]] = args[idx]
      }
    }

    /**
     * Set the ID for the corresponding record. You need this for `updateRecord` or `removeRecord`
     * operations. This method is chainable.
     * @method
     * @param {string|number} value - The ID value to set
     * @returns {DoboAction} The current instance for chaining
     */
    id = value => {
      this._id = value
      return this
    }

    /**
     * Set the body for the corresponding record. You need this for `createRecord`, `updateRecord`
     * or `upsertRecord` operations. This method is chainable.
     * @method
     * @param {object} value - The body value to set
     * @returns {DoboAction} The current instance for chaining
     */
    body = value => {
      this._body = value
      return this
    }

    /**
     * Set the filter for the corresponding record. You optionally need this for `findRecord`,
     * `findOneRecord` or `findAllRecord` operations. This method is chainable.
     * @method
     * @param {object} value - The filter value to set
     * @returns {DoboAction} The current instance for chaining
     */
    filter = value => {
      this._filter = value
      return this
    }

    field = value => {
      this._field = value
      return this
    }

    file = value => {
      this._file = value
      return this
    }

    /**
     * Set the options for the corresponding method. This method is chainable.
     * @method
     * @param {DoboAction.TOptions} value - The options to set
     * @returns {DoboAction} The current instance for chaining
     */
    options = (value = {}) => {
      for (const k in value) {
        this._options[k] = value
      }
      return this
    }

    /**
     * Execute the corresponding method with the set arguments and options. This method is chainable.
     * @async
     * @method
     * @param {DoboAction.TOptions} value - If set, it will override the options set by the `options()` method. This is useful if you want to set options at the last step.
     * @returns {Promise<*>} The result of the method execution
     */
    run = async (value = {}) => {
      this.options(value)
      const args = methods[this.name].map(item => this['_' + item])
      args.push(this._options)
      return await this.model[this.name](...args)
    }

    /**
     * Dispose the instance and clean up resources.
     * @async
     * @method
     * @returns {Promise<void>}
     */
    dispose = async () => {
      await super.dispose()
      this.model = null
      this._options = null
    }
  }

  this.app.baseClass.DoboAction = DoboAction
}

export default actionFactory
