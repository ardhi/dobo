import { sanitizeAll, sanitizeRef } from '../helper.js'
import clearRecord from './model/clear-record.js'
import countRecord from './model/count-record.js'
import createRecord from './model/create-record.js'
import drop from './model/drop.js'
import findAllRecord from './model/find-all-record.js'
import findOneRecord from './model/find-one-record.js'
import findRecord from './model/find-record.js'
import getRecord from './model/get-record.js'
import createHistogram from './model/create-histogram.js'
import createAggregate from './model/create-aggregate.js'
import exists from './model/exists.js'
import build from './model/build.js'
import loadFixtures from './model/load-fixtures.js'
import removeRecord from './model/remove-record.js'
import updateRecord from './model/update-record.js'
import createAttachment from './model/create-attachment.js'
import updateAttachment from './model/update-attachment.js'
import getAttachment from './model/get-attachment.js'
import removeAttachment from './model/remove-attachment.js'
import findAttachment from './model/find-attachment.js'
import sanitizeBody from './model/sanitize-body.js'
import sanitizeRecord from './model/sanitize-record.js'
import sanitizeFixture from './model/sanitize-fixture.js'
import upsertRecord from './model/upsert-record.js'
import bulkCreateRecord from './model/bulk-create-record.js'
import listAttachment from './model/list-attachment.js'
import transaction from './model/transaction.js'
import validate from './model/validate.js'

/**
 * @typedef {Object} TOptions
 * @memberof DoboModel
 * @type {Object}
 * @property {boolean} [noHook=false] - If `true`, no model's hook will be executed
 * @property {boolean} [noModelHook=false] - If `true`, no model's hook will be executed
 * @property {boolean} [noDynHook=false] - If `true`, no dynamic hook will be executed
 * @property {boolean} [noValidation=false] - If `true`, no validation of data payload performed
 * @property {boolean} [noCheckUnique=false] - If `true`, no unique validation for ID performed
 * @property {boolean} [noBodySanitizer=false] - If `true`, accept data payload as is without sanitization
 * @property {boolean} [noRecordSanitizer=false] - If `true`, accept result payload as is without sanitization
 * @property {boolean} [noResult=false] - If `true`, returns nothing
 * @property {boolean} [truncateString=true] - If `true` (default), string is truncated to its model's `maxLength`
 * @property {boolean} [partial] - If `true`, only updated values are saved. Otherwise replace all existing values with given payload. Defaults to `true` for `updateRecord`
 * @property {boolean} [dataOnly=true] - If `true` (default) returns only record's object. Otherwise {@link DoboModel.TResult}
 */

/**
 * Sort order key used in pagination and sorting of records. It can be either:
 * - `1` for ascending order (the default, if none is provided) or
 * - `-1` for descending order.
 * @typedef {string} TSortOrder
 * @memberof DoboModel
 */

/**
 * Key value pairs used as sort order in pagination and sorting of records. It is an object where:
 * - Key represents model's field name
 * - Value represents its sort order
 *
 * @typedef {Object.<string, DoboModel.TSortOrder>} TSort
 * @memberof DoboModel
 * @example
 * // to sort by firstName (ascending) and lastName (descending)
 * const sort = {
 *   firstName: 1,
 *   lastName: -1
 * }
 */

/**
 * @typedef {Object} TPagination
 * @memberof DoboModel
 * @property {number} limit - Number of records per page
 * @property {number} page - Page number
 * @property {number} [skip] - Records to skip. If not provided, it will be calculated based on `limit` and `page`
 */

/**
 * Property value type definition. Used for building property `values` in a model which is an array of this object type.
 * @typedef TPropertyValue
 * @memberof DoboModel
 * @type {Object}
 * @property {string} value - The actual value of the property
 * @property {string} text - The display text for the property value, which can be translated based on the request context
 */

/**
 * Formatted version of a record's property values. It is an object where:
 * - Key represents the property name
 * - Value represents its formatted value according to the property's data type or formatting function. Data type is ALWAYS in string.
 *
 * This record is then wrapped in a `_fmt` property.
 * @typedef TRecordFormatted
 * @memberof DoboModel
 * @type {Object}
 * @property {Object} [_fmt={}] - Wrapper
 * @example
 * {
 *   _fmt: {
 *     id: "1",
 *     item: "Laptop",
 *     createdAt: "Jan 1, 2024, 12:00 AM",
 *     isActive: "True",
 *     price: "2,500.00"
 *   }
 * }
 */

/**
 * Reference record related to a record's result. It is an object where:
 * - Key represents the name of the referenced record. Normally, it is the referenced model's name in camelCase format.
 * - Value represents its reference record. It can be an object or an array of objects, depending on the relationship type.
 *
 * This record is then wrapped in a `_ref` property in the result object.
 * @typedef TRecordRef
 * @memberof DoboModel
 * @type {Object}
 * @property {Object} [_ref={}] - Wrapper
 * @property {Object|Array} [_ref.<string>.<DoboModel.TRecord>] - Reference record
 * @example
 * {
 *   _ref: {
 *     user: {
 *       id: 1,
 *       name: "John Doe"
 *     },
 *     posts: [
 *       {
 *         id: 1,
 *         title: "Post Title"
 *       },
 *       {
 *         id: 2,
 *         title: "Another Post Title"
 *       }
 *     ]
 *   }
 * }
 */

/**
 * The record returned from a model's action. It is an object where:
 * - Key represents the property name
 * - Value represents its value according to the property's data type
 *
 * This record is then merged with {@link DoboModel.TRecordFormatted} and {@link DoboModel.TRecordRef} to form the final record returned from a model's action.
 * @typedef TRecord
 * @memberof DoboModel
 * @type {Object & DoboModel.TRecordFormatted & DoboModel.TRecordRef}
 * @example
 * {
 *   id: 1,
 *   item: "Laptop",
 *   createdAt: "2024-01-01T00:00:00.000Z",
 *   isActive: true,
 *   price: 2500.00,
 *   _fmt: {
 *     id: "1",
 *     item: "Laptop",
 *     createdAt: "Jan 1, 2024, 12:00 AM",
 *     isActive: "True",
 *     price: "2,500.00"
 *   },
 *   _ref: {
 *     user: {
 *       id: 1,
 *       name: "John Doe"
 *     }
 *   }
 * }
 */

/**
 * The result returned from a model's action other than `find*`, `{create|update|remove}Record` if `dataOnly` is set to `false`.
 * @typedef TResultRecord
 * @memberof DoboModel
 * @type {Object}
 * @property {Array<DoboModel.TRecord>} data - The data returned from the action
 */

/**
 * The result returned from a model's `find*` actions if `dataOnly` is set to `false`.
 * @typedef TResultFindRecord
 * @memberof DoboModel
 * @type {Object}
 * @property {Array<DoboModel.TRecord>} data - The data returned from the action
 * @property {number} [count] - The total number of records found, if applicable
 * @property {boolean} [cached] - Indicates if the result was retrieved from cache, if applicable. Only available if `bajoCache` is used
 * @property {Array} [warnings] - Any warnings generated during the action, if applicable
 */

/**
 * The result returned from a model's `getRecord` action if `dataOnly` is set to `false`.
 * @typedef TResultGetRecord
 * @memberof DoboModel
 * @type {Object}
 * @property {DoboModel.TRecord} data - The data returned from the action
 */

/**
 * The result returned from a model's `createRecord` action if `dataOnly` is set to `false`.
 * @typedef TResultCreateRecord
 * @memberof DoboModel
 * @type {Object}
 * @property {DoboModel.TRecord} data - The data returned from the action
 */

/**
 * The result returned from a model's `updateRecord` action if `dataOnly` is set to `false`.
 * @typedef TResultUpdateRecord
 * @memberof DoboModel
 * @type {Object}
 * @property {DoboModel.TRecord} data - The updated data returned from the action
 * @property {DoboModel.TRecord} oldData - The previous data before the update
 */

/**
 * The result returned from a model's `removeRecord` action if `dataOnly` is set to `false`.
 * @typedef TResultRemoveRecord
 * @memberof DoboModel
 * @type {Object}
 * @property {DoboModel.TRecord} oldData - The removed data returned from the action
 */

/**
 * Model factory.
 *
 * @async
 * @returns {Promise<void>} Returns nothing
 */
async function modelFactory () {
  const { Tools } = this.app.baseClass
  const { defaults } = this.app.lib._

  /**
   * Model class defintion.
   *
   * @class
   */
  class DoboModel extends Tools {
    /**
     * Constructor
     */
    constructor (plugin, options) {
      super(plugin)

      defaults(this, options)

      /**
       * Model's adapter name
       * @type {string}
       */
      this.adapter = this.connection.adapter

      this.bindThis(
        build,
        exists,
        drop,

        createRecord,
        getRecord,
        updateRecord,
        upsertRecord,
        removeRecord,
        clearRecord,
        findRecord,
        findOneRecord,
        findAllRecord,

        transaction,
        bulkCreateRecord,

        createAggregate,
        createHistogram,
        countRecord,

        createAttachment,
        getAttachment,
        updateAttachment,
        removeAttachment,
        findAttachment,
        listAttachment,

        loadFixtures,
        sanitizeRecord,
        sanitizeBody,
        sanitizeFixture,
        validate
      )

      // aliases
      this.deleteRecord = this.removeRecord
      this.clearRecords = this.clearRecord
      this.countRecords = this.countRecord
      this.findRecords = this.findRecord
      this.findAllRecords = this.findAllRecord
      this.listAttachments = this.listAttachment
      this.bulkCreateRecords = this.bulkCreateRecord

      this.getField = this.getProperty
      this.hasField = this.hasProperty
    }

    /**
     * Invoke a model's action. It will create a new instance of {@link DoboAction} and return it.
     * @method
     * @memberof DoboModel
     * @param {string} name - The name of the action to invoke
     * @param  {...any} args - Arguments to pass to the action
     * @returns {DoboAction} Returns an instance of {@link DoboAction}
     */
    action = (name, ...args) => {
      const action = new this.app.baseClass.DoboAction(this, name, ...args)
      return action
    }

    sanitizeObjectDef = async (obj) => {
      await sanitizeAll.call(this.app.dobo, obj)
    }

    /**
     * Sanitize a reference object based on the model's properties and rules.
     * @method
     * @memberof DoboModel
     * @async
     * @param {*} obj - The reference object to sanitize
     * @param {boolean} [fatal=true] - Whether to throw an error if sanitization fails
     */
    sanitizeRef = async (obj, fatal = true) => {
      await sanitizeRef.call(this.app.dobo, obj, this.app.dobo.models, fatal)
    }

    /**
     * Sanitize the given ID based on the model's properties.
     * @method
     * @memberof DoboModel
     * @param {string|number} id - The ID to sanitize
     * @returns {string|number} Returns the sanitized ID
     */
    sanitizeId = (id) => {
      const prop = this.properties.find(p => p.name === 'id')
      if (prop.type === 'integer') id = parseInt(id)
      return id
    }

    /**
     * Get a property by its name.
     * @method
     * @memberof DoboModel
     * @param {string} name - The name of the property to retrieve
     * @returns {Object|null} Returns the property object if found, otherwise `undefined`
     */
    getProperty = (name) => {
      return this.properties.find(prop => prop.name === name)
    }

    /**
     * Get the model's properties based on the given options.
     * @method
     * @memberof DoboModel
     * @param {Object} [options={}] - Options object
     * @param {boolean} [options.noVirtual=false] - If `true`, exclude virtual properties
     * @param {boolean} [options.namesOnly=false] - If `true`, return only property names instead of full property objects
     * @returns {Array<object|string>} Returns an array of properties or property names based on the options
     */
    getProperties = (options = {}) => {
      const { noVirtual, namesOnly } = options
      const items = noVirtual ? this.properties.filter(prop => !prop.virtual) : this.properties
      return namesOnly ? items.map(item => item.name) : items
    }

    /**
     * Get the model's virtual properties.
     * @method
     * @memberof DoboModel
     * @param {boolean} [namesOnly=false] - If `true`, return only property names instead of full property objects
     * @returns {Array<object|string>} Returns an array of virtual properties or property names based on the `namesOnly` option
     */
    getVirtualProperties = (namesOnly) => {
      const items = this.properties.filter(prop => prop.virtual)
      return namesOnly ? items.map(item => item.name) : items
    }

    /**
     * Get the model's non-virtual properties.
     * @method
     * @memberof DoboModel
     * @param {boolean} [namesOnly=false] - If `true`, return only property names instead of full property objects
     * @returns {Array<object|string>} Returns an array of non-virtual properties or property names based on the `namesOnly` option
     */
    getNonVirtualProperties = (namesOnly) => {
      const items = this.properties.filter(prop => !prop.virtual)
      return namesOnly ? items.map(item => item.name) : items
    }

    /**
     * Returns the model's indexes.
     * @method
     * @memberof DoboModel
     * @returns {Array<object>} Returns an array of index objects defined in the model
     */
    getIndexes = () => {
      return this.indexes
    }

    /**
     * Checks if the model has a property with the given name.
     * @method
     * @memberof DoboModel
     * @param {string} name - The name of the property to check
     * @returns {boolean} Returns `true` if the property exists, otherwise `false`
     */
    hasProperty = (name) => {
      return !!this.getProperty(name)
    }

    syncIdField = (idField) => {
      const { cloneDeep, findIndex } = this.app.lib._
      if (!this.adapter) return
      if (!idField) idField = cloneDeep(this.adapter.idField)
      const idx = findIndex(this.properties, { name: 'id' })
      if (idx === -1) return
      this.properties.splice(idx, 1)
      this.properties.unshift(idField)
    }

    /**
     * Internal method to perform a simple lookup based on the provided value and lookupValue.
     * @method
     * @internal
     * @memberof DoboModel
     * @async
     * @param {string|object|Array} value - The value to look up
     * @param {object} lookupValue - The lookup values to replace in the query
     * @param {object} [options={}] - Additional options for the lookup
     * @returns {*|null|undefined} Returns the result of the lookup or `null` if not found or `undefined` if the value is not a string, object, or array
     */
    _simpleLookup = async (value, lookupValue, options = {}) => {
      const { get, isEmpty, isString, isPlainObject, isArray } = this.app.lib._
      let model
      let field
      let query
      if (isString(value)) {
        [model, field, ...query] = value.split(':')
        query = query.join(':')
      } else if (isPlainObject(value)) ({ model, field, query } = value)
      else if (isArray(value)) [model, field, query] = value
      else return
      for (const key in lookupValue) {
        query = query.replaceAll(`{${key}}`, lookupValue[key])
      }
      if (isEmpty(field)) field = 'id'
      const { getModel } = this.app.dobo
      const ref = getModel(model)
      const opts = { ...options, noCache: true, noMagic: true }
      opts.dataOnly = true
      const rec = await ref.findOneRecord({ query }, opts)
      return get(rec, field, null)
    }

    /**
     * Builds the values for a given property if `prop.values` is set:
     * - If a string, it will be treated as a handler and executed to get the values.
     * - If a function, it will be executed to get the values.
     * - If an array, it will be used as is.
     *
     * Values are returned as an array of {@link DoboModel.TPropertyValues}.
     * If a request object is provided in the options, the `text` will be translated using
     * the request's translation function.
     * @async
     * @method
     * @memberof DoboModel
     * @param {object} prop - The property definition
     * @param {DoboModel.TOptions} opts - Additional options for building the property values
     * @returns {Array<DoboModel.TPropertyValue>} Returns an array of property values
     */
    buildPropValues = async (prop, opts) => {
      const { isString, camelCase, isFunction } = this.app.lib._
      const { callHandler } = this.app.bajo
      const values = isString(prop.values) || isFunction(prop.values) ? await callHandler(this, prop.values, opts) : [...prop.values]
      return values.map(v => {
        if (isString(v)) v = { value: v, text: v }
        if (opts.req) {
          const key = camelCase(`${prop.name} ${v.text}`)
          if (opts.req.te(key)) v.text = opts.req.t(key)
        }
        return v
      })
    }

    dispose = async () => {
      await super.dispose()
      this.connection = null
      this.adapter = null
    }
  }

  this.app.baseClass.DoboModel = DoboModel
}

export default modelFactory
