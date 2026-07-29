import { ulid } from 'ulid'
import { v4 as uuidv4, v7 as uuidv7 } from 'uuid'
import crypto from 'crypto'

const defIdField = {
  name: '_id',
  type: 'string',
  maxLength: 50,
  required: true,
  index: 'primary'
}

/**
 * @external Tools
 * @see {@link https://ardhi.github.io/bajo/Tools.html|Bajo Tools}
 */

/**
 * @typedef TIdField
 * @type {object}
 * @memberof DoboAdapter
 * @property {string} [name='_id'] - The name of the ID field.
 * @property {string} [type='string'] - The data type of the ID field.
 * @property {number} [maxLength=50] - The maximum length of the ID field.
 * @property {boolean} [required=true] - Indicates if the ID field is required.
 * @property {string} [index='primary'] - The index type of the ID field.
 */

/**
 * @typedef TSupport
 * @memberof DoboAdapter
 * @type {object}
 * @property {object} [propType={}] - An object indicating support for various property types.
 * @property {boolean} [propType.object=false] - Indicates if object property type is supported.
 * @property {boolean} [propType.array=false] - Indicates if array property type is supported.
 * @property {boolean} [propType.datetime=true] - Indicates if datetime property type is supported.
 * @property {boolean} [search=false] - Indicates if search functionality is supported.
 * @property {boolean} [uniqueIndex=false] - Indicates if unique index functionality is supported.
 * @property {boolean} [nullableField=true] - Indicates if nullable fields are supported.
 * @property {boolean} [transaction=false] - Indicates if transaction functionality is supported.
 */

/**
 * Adapter factory function.
 *
 * @async
 * @returns {Promise<DoboAdapter>}
 */
async function adapterFactory () {
  const { Tools } = this.app.baseClass
  const { pick, cloneDeep, has, uniq, without, isEmpty, omit, isFunction, camelCase, last } = this.app.lib._
  const { isSet } = this.app.lib.aneka
  const { runHook } = this.app.bajo

  /**
   * DoboAdapter class serves as a base class for all database adapters in the Dobo framework. It provides common functionality for managing models, records, and database operations.
   * Child classes should implement the abstract methods to provide specific database functionality.
   *
   * @class
   * @extends external:Tools
   */
  class DoboAdapter extends Tools {
    /**
     * Constructor.
     */
    constructor (plugin, name, options = {}) {
      super(plugin)

      /**
       * Adapter name
       * @type {string}
       */
      this.name = name

      /**
       * ID field configuration
       * @type {DoboAdapter.TIdField}
       */
      this.idField = cloneDeep(defIdField)
      this.propertyType = {}

      /**
       * Support configuration for the adapter
       * @type {DoboAdapter.TSupport}
       */
      this.support = {
        propType: {
          object: false,
          array: false,
          datetime: true
        },
        search: false,
        uniqueIndex: false,
        nullableField: true,
        transaction: false
      }

      /**
       * Indicates whether to use UTC for datetime fields
       * @type {boolean}
       */
      this.useUtc = false

      /**
       * Maximum chunk size for bulk operations
       * @type {number}
       */
      this.maxChunkSize = 500

      /**
       * Indicates whether the adapter uses in-memory storage
       * @type {boolean}
       */
      this.memory = false

      /**
       * Adapter options
       * @type {object}
       */
      this.options = options
    }

    /**
     * Sanitize connection object
     * @async
     * @method
     * @param {Object} conn - Connection object
     * @returns {Promise<void>}
     */
    async sanitizeConnection (conn) {
      conn.proto = conn.proto ?? 'http' // used by adapter that use url based connection
      conn.memory = false
    }

    /**
     * Sanitizes the body of a record before creating or updating it. It ensures that all required fields
     * are present and have valid values, and converts data types as necessary.
     * @param {DoboModel} model - The model instance for which the body is being sanitized
     * @param {object} body - The body of the record to be sanitized
     * @param {boolean} [partial=false] - Indicates whether to perform a partial update
     * @returns {object} - Sanitized body
     */
    sanitizeBody (model, body = {}, partial) {
      const { keys, pick } = this.app.lib._
      const item = cloneDeep(body)
      let newId = false
      if (has(item, 'id') && this.idField.name !== 'id') {
        item[this.idField.name] = item.id
        newId = true
      }
      for (const prop of model.getNonVirtualProperties()) {
        if (item[prop.name] === 'null') item[prop.name] = null
        if (!isSet(item[prop.name]) && !this.support.nullableField) {
          switch (prop.type) {
            case 'datetime': item[prop.name] = new Date(0); break
            case 'float':
            case 'double': item[prop.name] = 0; break
            case 'string':
            case 'text': item[prop.name] = ''; break
            case 'object': item[prop.name] = {}; break
            case 'array': item[prop.name] = []; break
          }
        }
        if (isSet(item[prop.name]) && !this.support.propType[prop.type]) {
          if (prop.type === 'datetime') item[prop.name] = item[prop.name].toISOString()
          else if (['object', 'array'].includes(prop.type)) item[prop.name] = JSON.stringify(item[prop.name])
        }
      }
      const result = partial ? pick(item, keys(body)) : item
      if (newId) delete result.id
      return result
    }

    /**
     * Sanitizes a record retrieved from the database, converting data types as necessary
     * and ensuring that the record conforms to the model's schema.
     * @param {DoboModel} model - The model instance for which the record is being sanitized
     * @param {object} [record={}] - The record retrieved from the database
     * @param {object} [options={}] - Additional options for sanitization
     * @returns {object} - Sanitized record
     */
    sanitizeRecord (model, record = {}, options = {}) {
      const { dayjs } = this.app.lib
      const { isString } = this.app.lib._
      const item = { ...record }
      if (has(item, this.idField.name) && this.idField.name !== 'id') {
        item.id = item[this.idField.name]
        delete item[this.idField.name]
      }
      for (const prop of model.properties) {
        if (isSet(item[prop.name])) {
          if (!this.support.propType[prop.type]) {
            try {
              if (prop.type === 'datetime') {
                const dt = this.useUtc ? dayjs.utc(item[prop.name]) : dayjs(item[prop.name])
                item[prop.name] = dt.toDate()
              } else if (isString(item[prop.name]) && ['object', 'array'].includes(prop.type)) item[prop.name] = JSON.parse(item[prop.name])
            } catch (err) {
              item[prop.name] = null
            }
          }
          if (prop.type === 'datetime' && isString(item[prop.name])) {
            const dt = this.useUtc ? dayjs.utc(item[prop.name]) : dayjs(item[prop.name])
            item[prop.name] = dt.toDate()
          }
          if (prop.type === 'boolean' && isSet(item[prop.name])) item[prop.name] = Boolean(item[prop.name])
        }
      }
      return item
    }

    /**
     * Utility method to get the real fields of a model, excluding virtual fields.
     * This is useful for operations that require only the actual stored properties of a model.
     * @param {*} model
     * @returns {string[]} - Array of real field names
     */
    getRealFields (model) {
      return model.getProperties({ noVirtual: true, namesOnly: true })
    }

    /**
     * Utility method to get the virtual fields of a model.
     * This is useful for operations that need to work with computed or derived properties.
     * @param {DoboModel} model - The model instance
     * @returns {string[]} - Array of virtual field names
     */
    getVirtualFields (model) {
      return model.getVirtualProperties({ namesOnly: true })
    }

    /**
     * Get returning fields for a model based on the provided options. If the adapter supports returning fields,
     * it will return the specified fields or all model properties. It ensures that the ID field is always
     * included in the returned fields.
     * @param {DoboModel} model - The model instance for which to get the returning fields
     * @param {object} options - Options that may include the fields to return
     * @returns {string[]} - Array of field names to be returned
     */
    _getReturningFields (model, options = {}) {
      const { fields = [] } = options
      if (!this.support.returning) return []
      let items = fields.length > 0 ? [...fields] : model.properties.map(prop => prop.name)
      if (!items.includes(this.idField.name)) items.unshift(this.idField.name)
      if (this.idField.name !== 'id') items = without(items, ['id'])
      return uniq(items)
    }

    /**
     * Attaches hooks to the model for various operations. It runs the appropriate hooks
     * before and after the specified operation, allowing for custom behavior to be injected
     * into the model's lifecycle.
     * @internal
     * @async
     * @method
     * @param {string} name - The name of the hook
     * @param {DoboModel} model - The model instance to which the hook is being attached
     * @param  {...any} args - Additional arguments to be passed to the hook
     */
    async _attachHook (name, model, ...args) {
      const { ns } = this.app.dobo
      const { kebabCase } = this.app.lib._
      const options = last(args)
      if (!options.noAdapterHook) {
        const prefix = kebabCase(name).split('-')[0]
        await runHook(`${ns}.adapter:${prefix}Any`, model, options)
        await runHook(`${ns}.adapter:${name}`, model, ...args)
        await runHook(`${ns}.adapter.${camelCase(model.name)}:${name}`, ...args)
      }
    }

    /**
     * Checks the uniqueness of fields with a unique index.
     * @async
     * @method
     * @internal
     * @param {DoboModel} model - The model instance to check
     * @param {object} body - The data to be checked for uniqueness
     * @param {object} options - Additional options, including the action being performed
     * @returns {Promise<void>} - Resolves if unique, throws an error if not
     */
    _checkUnique = async (model, body = {}, options = {}) => {
      const { isSet } = this.app.lib.aneka
      const { filter, map, isEmpty, forOwn } = this.app.lib._
      const indexes = filter(model.indexes ?? [], idx => idx.type === 'unique')
      for (const index of indexes) {
        const query = {}
        for (const field of index.fields) {
          if (isSet(body[field])) query[field] = body[field]
        }
        if (isEmpty(query)) continue
        const { data } = await model.findOneRecord({ query }, options)
        if (!isEmpty(data)) {
          if (['updateRecord', 'upsertRecord'].includes(options.action)) {
            let eq = true
            forOwn(query, (v, k) => {
              if (data[k] !== v) eq = false
            })
            if (!eq) continue
          }
          const error = this.app.dobo.t('uniqueConstraintError')
          const details = map(index.fields, field => {
            return { field, error }
          })
          throw this.app.dobo.error(error, { details, body })
        }
      }
    }

    // Internal calls that will be called by model

    /**
     * Wrapper for the `modelExists` method, called internally by `model` to make sure
     * all adapter hooks are executed accordingly, and all inputs and outputs are sanitized.
     *
     * @internal
     * @async
     * @method
     * @param {DoboModel} model
     * @param {object} options
     * @returns {Promise<boolean>}
     */
    async _modelExists (model, options = {}) {
      return await this.modelExists(model, options)
    }

    /**
     * Wrapper for the `buildModel` method, called internally by `model` to make sure
     * all adapter hooks are executed accordingly, and all inputs and outputs are sanitized.
     * @internal
     * @async
     * @method
     * @param {DoboModel} model
     * @param {object} options
     * @returns {Promise<object>}
     */
    async _buildModel (model, options = {}) {
      return await this.buildModel(model, options)
    }

    /**
     * Wrapper for the `dropModel` method, called internally by `model` to make sure
     * all adapter hooks are executed accordingly, and all inputs and outputs are sanitized.
     * @internal
     * @async
     * @method
     * @param {DoboModel} model
     * @param {object} options
     * @returns {Promise<object>}
     */
    async _dropModel (model, options = {}) {
      return await this.dropModel(model, options)
    }

    /**
     * Prepares the body of a record for creation by populating default values for properties
     * that are not set. It handles various types of default values, including functions,
     * special strings (like 'now', 'uuid', etc.), and static values.
     * @internal
     * @async
     * @method
     * @param {DoboModel} model - The model instance for which the body is being prepared
     * @param {object} body - The data to be prepared for creation
     * @param {object} options - Additional options that may affect the preparation
     * @returns {Promise<object>} - The prepared body with default values populated
     */
    async _prepBodyForCreate (model, body = {}, options = {}) {
      const { callHandler } = this.app.bajo
      const { isSet, generateId } = this.app.lib.aneka
      for (const prop of model.getProperties({ noVirtual: true })) {
        if (isSet(prop.default) && (!options.noDefault) && (!isSet(body[prop.name]) || body[prop.name] === prop.default)) {
          if (isFunction(prop.default)) body[prop.name] = await prop.default.call(model)
          else if (typeof prop.default !== 'string') body[prop.name] = prop.default
          else {
            if (['now'].includes(prop.default) && prop.type === 'datetime') {
              body[prop.name] = new Date()
            } else if (['uuid', 'uuidv4'].includes(prop.default) && prop.type === 'string') {
              body[prop.name] = uuidv4().slice(0, prop.maxLength)
            } else if (prop.default === 'uuidv7' && prop.type === 'string') {
              body[prop.name] = uuidv7().slice(0, prop.maxLength)
            } else if (prop.default === 'ulid' && prop.type === 'string') {
              body[prop.name] = ulid().slice(0, prop.maxLength)
            } else if (prop.default === 'generateid' && prop.type === 'string') {
              body[prop.name] = generateId()
            } else if (prop.default.startsWith('handler:')) {
              const [, ...args] = prop.default.split(':')
              if (args.length > 0) body[prop.name] = await callHandler(args.join(':'))
            } else if (prop.default.startsWith('md5:') && prop.type === 'string') {
              const [, field] = prop.default.split(':')
              const fields = field.split(',')
              if (model.properties.filter(item => fields.includes(item.name)).length === fields.length) {
                const values = fields.map(f => body[f])
                body[prop.name] = crypto.createHash('md5').update(values.join(':')).digest('hex')
              }
            } else {
              body[prop.name] = prop.default
            }
          }
        }
      }
      return pick(body, this.getRealFields(model))
    }

    /**
     * Prepares the ID for a record before creation. It generates an ID if it is not set in the body.
     *
     * @internal
     * @async
     * @method
     * @param {DoboModel} model - The model instance for which the ID is being prepared
     * @param {object} body - The data containing the ID
     * @param {object} options - Additional options that may affect ID generation
     * @returns {Promise<void>} - Resolves when the ID has been prepared
     */
    async _prepIdForCreate (model, body = {}, options = {}) {
      const { isSet, generateId } = this.app.lib.aneka
      const { isFunction } = this.app.lib._
      const prop = model.properties.find(p => p.name === 'id')
      if (!isSet(body.id) && prop.type === 'string') {
        if (this.idGenerator) {
          if (['uuid', 'uuidv4'].includes(this.idGenerator)) body.id = uuidv4()
          else if (['uuidv7'].includes(this.idGenerator)) body.id = uuidv7()
          else if (this.idGenerator === 'generateId') body.id = generateId()
          else if (isFunction(this.idGenerator)) body.id = await this.idGenerator(model, body, options)
        }
        if (!body.id) body.id = ulid()
        body.id = body.id.slice(0, prop.maxLength)
      }
    }

    _injectMeta (result = {}, options = {}) {
      result.warnings = result.warnings ?? []
      result.warnings.push(...(options.warnings ?? []))
    }

    /**
     * Wrapper for the {@link DoboAdapter#createRecord} method, called internally by `model` to make sure
     * all adapter hooks are executed accordingly, and all inputs and outputs are sanitized.
     * @internal
     * @async
     * @method
     * @param {DoboModel} model
     * @param {object} input
     * @param {object} options
     * @returns {Promise<object>}
     */
    async _createRecord (model, input = {}, options = {}) {
      const { isSet } = this.app.lib.aneka
      let body = await this._prepBodyForCreate(model, input, options)
      await this._prepIdForCreate(model, body, options)
      if (!options.noUniqueCheck) {
        if (!this.support.uniqueIndex) await this._checkUnique(model, body, options)
      }
      if (!options.noIdCheck && isSet(body.id)) {
        const resp = await this.getRecord(model, body.id, { noMagic: true })
        if (!isEmpty(resp.data)) throw this.plugin.error('recordExists%s%s', body.id, model.name)
      }
      body = this.sanitizeBody(model, body)

      await this._attachHook('beforeCreateRecord', model, body, options)
      const result = await this.createRecord(model, body, options)
      await this._attachHook('afterCreateRecord', model, body, result, options)

      if (options.noResult) return
      result.data = this.sanitizeRecord(model, result.data, options)
      this._injectMeta(result, options)
      return result
    }

    /**
     * Wrapper for the {@link DoboAdapter#bulkCreateRecord} method, called internally by `model` to make sure
     * all adapter hooks are executed accordingly, and all inputs and outputs are sanitized.
     * @internal
     * @async
     * @method
     * @param {DoboModel} model
     * @param {Array<object>} bodies
     * @param {object} options
     * @returns {Promise<void>}
     */
    async _bulkCreateRecord (model, bodies = [], options = {}) {
      const { chunk } = this.app.lib._
      let { chunkSize = this.maxChunkSize } = options
      if (chunkSize > this.maxChunkSize) chunkSize = this.maxChunkSize
      for (const idx in bodies) {
        const body = await this._prepBodyForCreate(model, bodies[idx], options)
        await this._prepIdForCreate(model, body, options)
        bodies[idx] = this.sanitizeBody(model, body)
      }

      await this._attachHook('beforeBulkCreateRecord', model, bodies, options)
      const items = chunk(bodies, chunkSize)
      for (const item of items) {
        await this.bulkCreateRecord(model, item, options)
      }
      await this._attachHook('afterBulkCreateRecord', model, bodies, [], options)
    }

    /**
     * Wrapper for the {@link DoboAdapter#getRecord} method, called internally by `model` to make sure
     * all adapter hooks are executed accordingly, and all inputs and outputs are sanitized.
     * @internal
     * @async
     * @method
     * @param {DoboModel} model
     * @param {string|number} id
     * @param {object} options
     * @returns {Promise<object>}
     */
    async _getRecord (model, id, options = {}) {
      await this._attachHook('beforeGetRecord', model, id, options)
      const result = await this.getRecord(model, id, options)
      await this._attachHook('afterGetRecord', model, id, result, options)

      if (isEmpty(result.data) && options.throwNotFound) throw this.plugin.error('recordNotFound%s%s', id, model.name)
      result.data = this.sanitizeRecord(model, result.data, options)
      this._injectMeta(result, options)
      return result
    }

    /**
     * Wrapper for the {@link DoboAdapter#updateRecord} method, called internally by `model` to make sure
     * all adapter hooks are executed accordingly, and all inputs and outputs are sanitized.
     * @internal
     * @async
     * @method
     * @param {DoboModel} model
     * @param {string|number} id
     * @param {object} input
     * @param {object} options
     * @returns {Promise<object>}
     */
    async _updateRecord (model, id, input = {}, options = {}) {
      let body = omit(input, this.getVirtualFields(model))
      if (!options.noUniqueCheck) {
        if (!this.support.uniqueIndex) await this._checkUnique(model, body, options)
      }
      if (!options._data) {
        const resp = await this.getRecord(model, id, { noMagic: true })
        if (!resp.data) throw this.plugin.error('recordNotFound%s%s', id, model.name)
        options._data = resp.data
      }
      body = this.sanitizeBody(model, body, true)
      delete body.id

      await this._attachHook('beforeUpdateRecord', model, id, body, options)
      const result = await this.updateRecord(model, id, body, options)
      await this._attachHook('afterUpdateRecord', model, id, body, result, options)

      if (options.noResult) return
      result.oldData = this.sanitizeRecord(model, result.oldData, options)
      result.data = this.sanitizeRecord(model, result.data, options)
      this._injectMeta(result, options)
      return result
    }

    /**
     * Upserts a record for the given model.
     * This method will only run if child adapter does not implement {@link DoboAdapter#upsertRecord}.
     *
     * @internal
     * @async
     * @method
     * @param {DoboModel} model - The model instance for which the record is being upserted
     * @param {object} input - The input data for the upsert
     * @param {object} options - Additional options that may affect record upserting
     * @returns {Promise<object>} - The result of the record upsert
     */
    async _upsertRecord (model, input = {}, options = {}) {
      let body = omit(input, this.getVirtualFields(model))
      if (!options.noUniqueCheck) {
        if (!this.support.uniqueIndex) await this._checkUnique(model, body, options)
      }
      if (isSet(body.id)) {
        if (!options._data) {
          const resp = await this.getRecord(model, body.id, { noMagic: true })
          if (!resp.data) throw this.plugin.error('recordNotFound%s%s', body.id, model.name)
          options._data = resp.data
        }
      }
      body = this.sanitizeBody(model, body)

      await this._attachHook('beforeUpsertRecord', model, body, options)
      const result = await this.upsertRecord(model, body, options)
      await this._attachHook('afterUpsertRecord', model, body, result, options)

      if (options.noResult) return
      if (result.oldData) result.oldData = this.sanitizeRecord(model, result.oldData, options)
      result.data = this.sanitizeRecord(model, result.data, options)
      this._injectMeta(result, options)
      return result
    }

    /**
     * Wrapper for the {@link DoboAdapter#removeRecord} method, called internally by `model` to make sure
     * all adapter hooks are executed accordingly, and all inputs and outputs are sanitized.
     * @internal
     * @async
     * @method
     * @param {DoboModel} model
     * @param {string|number} id
     * @param {object} options
     * @returns {Promise<object>}
     */
    async _removeRecord (model, id, options = {}) {
      if (!options._data) {
        const resp = await this.getRecord(model, id, { noMagic: true })
        if (!resp.data) throw this.plugin.error('recordNotFound%s%s', id, model.name)
        options._data = resp.data
      }

      await this._attachHook('beforeRemoveRecord', model, id, options)
      const result = await this.removeRecord(model, id, options)
      await this._attachHook('afterRemoveRecord', model, id, result, options)

      if (options.noResult) return
      result.oldData = this.sanitizeRecord(model, result.oldData, options)
      this._injectMeta(result, options)
      return result
    }

    /**
     * Wrapper for the {@link DoboAdapter#clearRecord} method, called internally by `model` to make sure
     * all adapter hooks are executed accordingly, and all inputs and outputs are sanitized.
     * @internal
     * @async
     * @method
     * @param {DoboModel} model
     * @param {object} options
     * @returns {Promise<object>}
     */
    async _clearRecord (model, options = {}) {
      await this._attachHook('beforeClearRecord', model, options)
      const result = await this.clearRecord(model, options)
      await this._attachHook('afterClearRecord', model, result, options)

      this._injectMeta(result, options)
      return result
    }

    /**
     * Wrapper for the {@link DoboAdapter#findRecord} method, called internally by `model` to make sure
     * all adapter hooks are executed accordingly, and all inputs and outputs are sanitized.
     * @internal
     * @async
     * @method
     * @param {DoboModel} model
     * @param {object} filter
     * @param {object} options
     * @returns {Promise<object>}
     */
    async _findRecord (model, filter = {}, options = {}) {
      let result
      try {
        await this._attachHook('beforeFindRecord', model, filter, options)
        result = await this.findRecord(model, filter, options)
        await this._attachHook('afterFindRecord', model, filter, result, options)
      } catch (err) {
        if (!['_emptyColumnQuery', '_abortAction'].includes(err.message)) throw err
        result = {
          data: [],
          count: 0
          // warnings: [] // TODO: should generate warnings?
        }
      }

      for (const idx in result.data) {
        result.data[idx] = this.sanitizeRecord(model, result.data[idx], options)
      }
      this._injectMeta(result, options)
      return result
    }

    /**
     * Finds all records for the given model based on the provided filter.
     * This method will only run if child adapter does not implement {@link DoboAdapter#findAllRecord}.
     *
     * @internal
     * @async
     * @method
     * @param {DoboModel} model - The model instance for which the records are being found
     * @param {object} filter - The filter criteria for finding records
     * @param {object} options - Additional options that may affect record finding
     * @returns {Promise<object>} - The result of the record finding
     */
    async _findAllRecord (model, filter = {}, options = {}) {
      let result
      try {
        await this._attachHook('beforeFindAllRecord', model, filter, options)
        result = await this.findAllRecord(model, filter, options)
        await this._attachHook('afterFindAllRecord', model, filter, result, options)
      } catch (err) {
        if (err.message !== '_emptyColumnQuery') throw err
        result = {
          data: [],
          count: 0
          // warnings: [] // TODO: should generate warnings?
        }
      }

      for (const idx in result.data) {
        result.data[idx] = this.sanitizeRecord(model, result.data[idx], options)
      }
      this._injectMeta(result, options)
      return result
    }

    /**
     * Wrapper for the {@link DoboAdapter#countRecord} method, called internally by `model` to make sure
     * all adapter hooks are executed accordingly, and all inputs and outputs are sanitized.
     * @internal
     * @async
     * @method
     * @param {DoboModel} model
     * @param {object} filter
     * @param {object} options
     * @returns {Promise<object>}
     */
    async _countRecord (model, filter = {}, options = {}) {
      let result
      try {
        await this._attachHook('beforeCountRecord', model, filter, options)
        result = await this.countRecord(model, filter, options)
        await this._attachHook('afterCountRecord', model, filter, result, options)
      } catch (err) {
        if (err.message !== '_emptyColumnQuery') throw err
        result = { data: 0 }
      }

      return result
    }

    /**
     * Wrapper for the {@link DoboAdapter#createAggregate} method, called internally by `model` to make sure
     * all adapter hooks are executed accordingly, and all inputs and outputs are sanitized.
     * @internal
     * @async
     * @method
     * @param {DoboModel} model
     * @param {object} filter
     * @param {object} params
     * @param {object} options
     * @returns {Promise<object>}
     */
    async _createAggregate (model, filter = {}, params = {}, options = {}) {
      const fieldPropTypes = ['integer', 'smallint', 'float', 'double']
      const groupPropTypes = ['string', ...fieldPropTypes]
      this.app.dobo.checkAggregateParams(params)
      const { group, field } = params

      let prop = model.properties.find(p => p.name === group)
      if (!prop) throw this.plugin.error('unknown%s%s', this.plugin.t('field.field'), group)
      if (!groupPropTypes.includes(prop.type)) throw this.plugin.error('allowedPropType%s%s', group, groupPropTypes.join(', '))

      prop = model.properties.find(p => p.name === field)
      if (!prop) throw this.plugin.error('unknown%s%s', this.plugin.t('field.field'), field)
      // if (!fieldPropTypes.includes(prop.type)) throw this.plugin.error('allowedPropType%s%s', field, fieldPropTypes.join(', '))

      let result
      try {
        await this._attachHook('beforeCreateAggregate', model, filter, params, options)
        result = await this.createAggregate(model, filter, params, options)
        await this._attachHook('afterCreateAggregate', model, filter, params, result, options)
      } catch (err) {
        if (err.message !== '_emptyColumnQuery') throw err
        result = { data: [] }
      }

      for (const idx in result.data) {
        result.data[idx] = this.sanitizeRecord(model, result.data[idx])
      }
      this._injectMeta(result, options)
      return result
    }

    /**
     * Wrapper for the {@link DoboAdapter#createHistogram} method, called internally by `model` to make sure
     * all adapter hooks are executed accordingly, and all inputs and outputs are sanitized.
     * @internal
     * @async
     * @method
     * @param {DoboModel} model
     * @param {object} filter
     * @param {object} params
     * @param {object} options
     * @returns {Promise<object>}
     */
    async _createHistogram (model, filter = {}, params, options = {}) {
      // const fieldPropTypes = ['integer', 'smallint', 'float', 'double']
      const groupPropTypes = ['datetime', 'date']
      this.app.dobo.checkHistogramParams(params)
      const { group, field } = params

      let prop = model.properties.find(p => p.name === group)
      if (!prop) throw this.plugin.error('unknown%s%s', this.plugin.t('field.field'), group)
      if (!groupPropTypes.includes(prop.type)) throw this.plugin.error('allowedPropType%s%s', group, groupPropTypes.join(', '))

      prop = model.properties.find(p => p.name === field)
      if (!prop) throw this.plugin.error('unknown%s%s', this.plugin.t('field.field'), field)

      let result
      try {
        await this._attachHook('beforeCreateHistogram', model, filter, params, options)
        result = await this.createHistogram(model, filter, params, options)
        await this._attachHook('afterCreateHistogram', model, filter, params, result, options)
      } catch (err) {
        if (err.message !== '_emptyColumnQuery') throw err
        result = { data: [] }
      }

      for (const idx in result.data) {
        result.data[idx] = this.sanitizeRecord(model, result.data[idx])
      }
      this._injectMeta(result, options)
      return result
    }

    // Public calls that need to be implemented by child adapters

    /**
     * Connects to the database using the provided connection parameters.
     * @param {*} connection - The connection parameters for the database
     * @param {*} noRebuild - Flag indicating whether to skip rebuilding the database schema
     * @returns {Promise<void>} - Resolves when the connection is established
     */
    async connect (connection, noRebuild) {
    }

    /**
     * Checks if the model exists in the database.
     *
     * Must be implemented by child classes to provide specific database functionality for model existence checking,
     * or throw an error if the operation is not supported by the adapter.
     *
     * @param {DoboModel} model - The model instance to check for existence
     * @param {object} options - Additional options that may affect the existence check
     */
    async modelExists (model, options = {}) {
      throw this.plugin.error('notSupportedAdapter%s%s%s', this.app.t('method'), 'modelExists', this.name)
    }

    /**
     * Builds the model in the database.
     *
     * Must be implemented by child classes to provide specific database functionality for model building,
     * or throw an error if the operation is not supported by the adapter.
     *
     * @param {DoboModel} model - The model instance for which the record is being built
     * @param {object} options - Additional options that may affect model building
     */
    async buildModel (model, options = {}) {
      throw this.plugin.error('notSupportedAdapter%s%s%s', this.app.t('method'), 'buildModel', this.name)
    }

    /**
     * Drops the model from the database.
     *
     * Must be implemented by child classes to provide specific database functionality for dropping a model,
     * or throw an error if the operation is not supported by the adapter.
     *
     * @param {DoboModel} model - The model instance for which the record is being dropped
     * @param {object} options - Additional options that may affect record dropping
     */
    async dropModel (model, options = {}) {
      throw this.plugin.error('notSupportedAdapter%s%s%s', this.app.t('method'), 'dropModel', this.name)
    }

    /**
     * Creates a new record for the given model.
     *
     * Must be implemented by child classes to provide specific database functionality for record creation,
     * or throw an error if the operation is not supported by the adapter.
     *
     * @param {DoboModel} model - The model instance for which the record is being created
     * @param {object} input - The input data for the new record
     * @param {object} options - Additional options that may affect record creation
     * @returns {Promise<object>} - The result of the record creation
     */
    async createRecord (model, body = {}, options = {}) {
      throw this.plugin.error('notSupportedAdapter%s%s%s', this.app.t('method'), 'createRecord', this.name)
    }

    /**
     * Retrieves a record for the given model by its ID.
     *
     * Must be implemented by child classes to provide specific database functionality for record retrieval,
     * or throw an error if the operation is not supported by the adapter.
     *
     * @param {DoboModel} model - The model instance for which the record is being retrieved
     * @param {string|number} id - The ID of the record to retrieve
     * @param {object} options - Additional options that may affect record retrieval
     * @returns {Promise<object>} - The result of the record retrieval
     */
    async getRecord (model, id, options = {}) {
      throw this.plugin.error('notSupportedAdapter%s%s%s', this.app.t('method'), 'getRecord', this.name)
    }

    /**
     * Updates a record for the given model by its ID.
     *
     * Must be implemented by child classes to provide specific database functionality for record updating,
     * or throw an error if the operation is not supported by the adapter.
     *
     * @param {DoboModel} model - The model instance for which the record is being updated
     * @param {string|number} id - The ID of the record to update
     * @param {object} input - The input data for the update
     * @param {object} options - Additional options that may affect record updating
     * @returns {Promise<object>} - The result of the record update
     */
    async updateRecord (model, id, body = {}, options = {}) {
      throw this.plugin.error('notSupportedAdapter%s%s%s', this.app.t('method'), 'updateRecord', this.name)
    }

    /**
     * Removes a record for the given model by its ID.
     *
     * Must be implemented by child classes to provide specific database functionality for record removal,
     * or throw an error if the operation is not supported by the adapter.
     *
     * @param {DoboModel} model - The model instance for which the record is being removed
     * @param {string|number} id - The ID of the record to remove
     * @param {object} options - Additional options that may affect record removal
     * @returns {Promise<object>} - The result of the record removal
     */
    async removeRecord (model, id, options = {}) {
      throw this.plugin.error('notSupportedAdapter%s%s%s', this.app.t('method'), 'removeRecord', this.name)
    }

    /**
     * Clears all records for the given model.
     *
     * Must be implemented by child classes to provide specific database functionality for record clearing,
     * or throw an error if the operation is not supported by the adapter.
     *
     * @param {DoboModel} model - The model instance for which the records are being cleared
     * @param {object} options - Additional options that may affect record clearing
     * @returns {Promise<object>} - The result of the record clearing
     */
    async clearRecord (model, options = {}) {
      throw this.plugin.error('notSupportedAdapter%s%s%s', this.app.t('method'), 'clearRecord', this.name)
    }

    /**
     * Finds records for the given model based on the provided filter.
     *
     * Must be implemented by child classes to provide specific database functionality for record finding,
     * or throw an error if the operation is not supported by the adapter.
     *
     * @param {DoboModel} model - The model instance for which the records are being found
     * @param {object} filter - The filter criteria for finding records
     * @param {object} options - Additional options that may affect record finding
     * @returns {Promise<object>} - The result of the record finding
     */
    async findRecord (model, filter = {}, options = {}) {
      throw this.plugin.error('notSupportedAdapter%s%s%s', this.app.t('method'), 'findRecord', this.name)
    }

    /**
     * Bulk creates records for the given model.
     *
     * Must be implemented by child classes to provide specific database functionality for bulk record creation,
     * or throw an error if the operation is not supported by the adapter.
     *
     * @param {DoboModel} model - The model instance for which the records are being created
     * @param {Array<object>} bodies - The array of input data for the new records
     * @param {object} options - Additional options that may affect record creation
     * @returns {Promise<void>} - Resolves when the records have been created
     */
    async bulkCreateRecord (model, bodies = [], options = {}) {
      throw this.plugin.error('notSupportedAdapter%s%s%s', this.app.t('method'), 'bulkCreateRecord', this.name)
    }

    /**
     * Counts the records for the given model based on the provided filter.
     *
     * Must be implemented by child classes to provide specific database functionality for record counting,
     * or throw an error if the operation is not supported by the adapter.
     *
     * @param {DoboModel} model - The model instance for which the records are being counted
     * @param {object} filter - The filter criteria for counting records
     * @param {object} options - Additional options that may affect record counting
     * @returns {Promise<object>} - The result of the record counting
     */
    async countRecord (model, filter = {}, options = {}) {
      throw this.plugin.error('notSupportedAdapter%s%s%s', this.app.t('method'), 'countRecord', this.name)
    }

    /**
     * Creates an aggregate for the given model based on the provided filter and parameters.
     *
     * Must be implemented by child classes to provide specific database functionality for aggregate creation,
     * or throw an error if the operation is not supported by the adapter.
     *
     * @param {DoboModel} model - The model instance for which the aggregate is being created
     * @param {object} filter - The filter criteria for creating the aggregate
     * @param {object} params - The parameters for the aggregate creation
     * @param {object} options - Additional options that may affect aggregate creation
     * @returns {Promise<object>} - The result of the aggregate creation
     */
    async createAggregate (model, filter = {}, params = {}, options = {}) {
      throw this.plugin.error('notSupportedAdapter%s%s%s', this.app.t('method'), 'createAggregate', this.name)
    }

    /**
     * Creates a histogram for the given model based on the provided filter and parameters.
     *
     * Must be implemented by child classes to provide specific database functionality for histogram creation,
     * or throw an error if the operation is not supported by the adapter.
     *
     * @param {DoboModel} model - The model instance for which the histogram is being created
     * @param {object} filter - The filter criteria for creating the histogram
     * @param {object} params - The parameters for the histogram creation
     * @param {object} options - Additional options that may affect histogram creation
     * @returns {Promise<object>} - The result of the histogram creation
     */
    async createHistogram (model, filter = {}, params = {}, options = {}) {
      throw this.plugin.error('notSupportedAdapter%s%s%s', this.app.t('method'), 'createHistogram', this.name)
    }

    /**
     * Executes a transaction for the given model.
     *
     * Must be implemented by child classes to provide specific database functionality for transactions,
     * or throw an error if the operation is not supported by the adapter.
     *
     * @param {DoboModel} model - The model instance for which the transaction is being executed
     * @param {Function} handler - The transaction handler function
     * @param  {...any} args - Additional arguments for the transaction handler
     */
    async transaction (model, handler, ...args) {
      throw this.plugin.error('notSupportedAdapter%s%s%s', this.app.t('method'), 'transaction', this.name)
    }

    /**
     * Disposes of the adapter, performing any necessary cleanup operations.
     *
     * @returns {Promise<void>} - Resolves when the adapter has been disposed
     */
    async dispose () {
      await super.dispose()
    }
  }

  class DoboNullAdapter extends DoboAdapter {
    constructor (plugin, name = 'null', options = {}) {
      super(plugin, name, options)
      this.memory = true
    }
  }

  this.app.baseClass.DoboAdapter = DoboAdapter
  this.app.baseClass.DoboNullAdapter = DoboNullAdapter
}

export default adapterFactory
