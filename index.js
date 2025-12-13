import collectConnections from './lib/collect-connections.js'
import collectDrivers from './lib/collect-drivers.js'
import collectFeatures from './lib/collect-features.js'
import collectSchemas from './lib/collect-schemas.js'
import nql from '@tryghost/nql'
import path from 'path'

import connectionFactory from './lib/factory/connection.js'
import featureFactory from './lib/factory/feature.js'
import { driverFactory } from './lib/factory/driver.js'
import schemaFactory from './lib/factory/schema.js'

/**
 * @typedef {string} TRecordSortKey
 */

/**
 * Key value pairs used as sort information:
 * - Key represent model's field name
 * - value represent its sort order: ```1``` for ascending order, and ```-1``` for descending order
 *
 * Example: to sort by firstName (ascending) and lastName (descending)
 * ```javascript
 * const sort = {
 *   firstName: 1,
 *   lastName: -1
 * }
 * ```
 *
 * @typedef {Object.<string, TRecordSortKey>} TRecordSort
 */

/**
 * @typedef {Object} TRecordPagination
 * @property {number} limit - Number of records per page
 * @property {number} page - Page number
 * @property {number} skip - Records to skip
 * @property {TRecordSort} sort - Sort order
 */

/**
 * @typedef {Object} TPropType
 * @property {Object} integer
 * @property {string} [integer.validator=number]
 * @property {Object} smallint
 * @property {string} [smallint.validator=number]
 * @property {Object} text
 * @property {string} [text.validator=string]
 * @property {string} [text.textType=string]
 * @property {string[]} [text.values=['text', 'mediumtext', 'longtext']]
 * @property {Object} string
 * @property {string} [string.validator=string]
 * @property {maxLength} [string.maxLength=255]
 * @property {minLength} [string.minLength=0]
 * @property {Object} float
 * @property {string} [float.validator=number]
 * @property {Object} double
 * @property {string} [double.validator=number]
 * @property {Object} boolean
 * @property {string} [boolean.validator=boolean]
 * @property {Object} datetime
 * @property {string} [datetime.validator=date]
 * @property {Object} date
 * @property {string} [date.validator=date]
 * @property {Object} time
 * @property {string} [time.validator=date]
 * @property {Object} timestamp
 * @property {string} [timestamp.validator=timestamp]
 * @property {Object} object={}
 * @property {Object} array={}
 */
const propType = {
  integer: {
    validator: 'number',
    rules: []
  },
  smallint: {
    validator: 'number',
    rules: []
  },
  text: {
    validator: 'string',
    textType: 'text',
    values: ['text', 'mediumtext', 'longtext'],
    rules: []
  },
  string: {
    validator: 'string',
    maxLength: 50,
    minLength: 0,
    rules: []
  },
  float: {
    validator: 'number',
    rules: []
  },
  double: {
    validator: 'number',
    rules: []
  },
  boolean: {
    validator: 'boolean',
    rules: []
  },
  date: {
    validator: 'date',
    rules: []
  },
  datetime: {
    validator: 'date',
    rules: []
  },
  time: {
    validator: 'date',
    rules: []
  },
  timestamp: {
    validator: 'timestamp',
    rules: []
  },
  object: {
    validator: null,
    rules: []
  },
  array: {
    validator: null,
    rules: []
  }
}

/**
 * @typedef {Object} TLib
 * @property {Object} Connection - Connection class
 * @property {Object} Feature - Feature class
 * @property {Object} Driver - Driver class
 * @property {Object} Schema - Schema class
*/
const lib = {}

/**
 * Plugin factory
 *
 * @param {string} pkgName - NPM package name
 * @returns {class}
 */
async function factory (pkgName) {
  const me = this
  const { breakNsPath } = this.app.bajo

  lib.Connection = await connectionFactory.call(this)
  lib.Feature = await featureFactory.call(this)
  lib.Driver = await driverFactory.call(this)
  lib.Schema = await schemaFactory.call(this)
  const { find, filter, isString, map } = this.app.lib._

  /**
   * Dobo Database Framework for {@link https://github.com/ardhi/bajo|Bajo}.
   *
   * See {@tutorial ecosystem} for available drivers & tools
   *
   * @class
   */
  class Dobo extends this.app.pluginClass.base {
    /**
     * @constant {string}
     * @memberof Dobo
     * @default 'db'
     */
    static alias = 'db'

    /**
     * @constant {string[]}
     * @memberof Dobo
     * @default ['count', 'avg', 'min', 'max', 'sum']
     */
    static aggregateTypes = ['count', 'avg', 'min', 'max', 'sum']
    /**
     * @constant {TPropType}
     * @memberof Dobo
     */
    static propType = propType

    /**
     * @constant {string[]}
     * @memberof Dobo
     * @default ['index', 'unique', 'primary', 'fulltext']
     */
    static indexTypes = ['index', 'unique', 'primary', 'fulltext']

    constructor () {
      super(pkgName, me.app)
      this.config = {
        connections: [],
        validationParams: {
          abortEarly: false,
          convert: false,
          allowUnknown: true
        },
        default: {
          filter: {
            limit: 25,
            maxLimit: 200,
            hardLimit: 10000,
            sort: ['dt:-1', 'updatedAt:-1', 'updated_at:-1', 'createdAt:-1', 'createdAt:-1', 'ts:-1', 'username', 'name']
          }
        },
        memDb: {
          autoSaveDur: '1s'
        },
        applet: {
          confirmation: false
        }
      }

      /**
       * @type {Object[]}
       */
      this.drivers = []

      /**
       * @type {Object[]}
       */
      this.connections = []

      /**
       * @type {Object[]}
       */
      this.features = []

      /**
       * @type {Object[]}
       */
      this.schemas = []

      /**
       * @type {Object}
       */
      this.lib = lib
    }

    /**
     * Get allowed property keys by field type
     *
     * @param {string} type
     * @returns {string[]}
     */
    getPropKeys = (type) => {
      const keys = ['name', 'type', 'required', 'rules', 'validator']
      if (['string'].includes(type)) keys.push('minLength', 'maxLength', 'values')
      if (['text'].includes(type)) keys.push('textType')
      if (['smallint', 'integer'].includes(type)) keys.push('autoInc', 'values')
      if (['float', 'double'].includes(type)) keys.push('values')
      return keys
    }

    /**
     * Get all allowed property keys
     *
     * @returns {string[]}
     */

    getAllPropKeys = () => {
      const { uniq } = this.app.lib._
      const keys = ['name', 'type', 'required', 'ref']
      for (const type in propType) {
        keys.push(...Object.keys(propType[type]))
      }
      return uniq(keys)
    }

    /**
     * Initialize plugin and performing the following tasks:
     * - {@link module:Lib.collectDrivers|Collecting all drivers}
     * - {@link module:Lib.collectConnections|Collecting all connections}
     * - {@link module:Lib.collectFeatures|Collecting all features}
     * - {@link module:Lib.collectSchemas|Collecting all schemas}
     * @method
     * @async
     */
    init = async () => {
      await collectDrivers.call(this)
      await collectConnections.call(this)
      await collectFeatures.call(this)
      await collectSchemas.call(this)
    }

    /**
     * Start plugin
     *
     * @method
     * @async
     * @param {(string|Array)} [conns=all] - Which connections should be run on start
     * @param {boolean} [noRebuild=false] - Set ```true``` to ALWAYS rebuild model on start. Yes, only set it to ```true``` if you REALLY know what you're doing!!!
     */
    start = async (conns = 'all', noRebuild = true) => {
      if (conns === 'all') conns = this.connections
      else if (isString(conns)) conns = filter(this.connections, { name: conns })
      else conns = map(conns, c => find(this.connections, { name: c }))
      this.log.debug('dbInit')
      for (const connection of conns) {
        const schemas = filter(this.schemas, { connection: connection.name })
        connection.client = await connection.driver.init({ connection, schemas, noRebuild })
        this.log.trace('dbInit%s%s%s', connection.driver.plugin.ns, connection.driver.name, connection.name)
      }
    }

    /**
     * Get connection by name. It returns the first connection named after "{name}"
     *
     * @param {string} - Connection name
     * @returns {Driver} Return connection instance
     */
    getConnection = name => {
      return find(this.connections, { name })
    }

    /**
     * Get driver by name. It returns the first driver named after "{name}"
     *
     * Also support NsPath format for those who load the same named driver but from different provider/plugin.
     *
     * @param {string} - Driver name
     * @returns {Driver} Return driver instance
     */
    getDriver = name => {
      const { breakNsPath } = this.app.bajo
      if (!name.includes(':')) return find(this.drivers, { name })
      const { ns, path } = breakNsPath(name)
      return find(this.drivers, d => d.name === path && d.plugin.ns === ns)
    }

    /**
     * Get feature by name. It returns the first driver named after "{name}"
     *
     * Also support NsPath format for those who load the same named driver but from different provider/plugin.
     *
     * @param {string} - Feature name
     * @returns {Feature} Return feature instance
     */
    getFeature = name => {
      if (!name.includes(':')) return find(this.features, { name })
      const { ns, path } = breakNsPath(name)
      return find(this.features, d => d.name === path && d.plugin.ns === ns)
    }

    /**
     * Get schema by name
     *
     * @param {string} name - Schema name
     * @retuns {Object}
     */
    getSchema = name => {
      return find(this.schemas, { name })
    }

    /**
     * Pick only fields defined from a record
     *
     * @method
     * @async
     * @param {Object} [options={}] - Options object
     * @param {Object} options.record - Record to pick fields from
     * @param {Array} options.fields - Array of field names to be picked
     * @param {Object} options.schema - Associated record's schema
     * @param {Object} [options.hidden=[]] - Additional fields to be hidden in addition the one defined in schema
     * @param {boolean} [options.forceNoHidden] - Force ALL fields to be picked, thus ignoring hidden fields
     * @returns {Object}
     */
    pickRecord = async ({ record, fields, schema = {}, hidden = [], forceNoHidden } = {}) => {
      const { isArray, pick, clone, isEmpty, omit } = this.app.lib._
      const { dayjs } = this.app.lib

      const transform = async ({ record, schema, hidden = [], forceNoHidden } = {}) => {
        if (record._id) {
          record.id = record._id
          delete record._id
        }
        const defHidden = [...schema.hidden, ...hidden]
        let result = {}
        for (const p of schema.properties) {
          if (!forceNoHidden && defHidden.includes(p.name)) continue
          result[p.name] = record[p.name] ?? null
          if (record[p.name] === null) continue
          switch (p.type) {
            case 'boolean': result[p.name] = !!result[p.name]; break
            case 'time': result[p.name] = dayjs(record[p.name]).format('HH:mm:ss'); break
            case 'date': result[p.name] = dayjs(record[p.name]).format('YYYY-MM-DD'); break
            case 'datetime': result[p.name] = dayjs(record[p.name]).toISOString(); break
          }
        }
        result = await this.sanitizeBody({ body: result, schema, partial: true, ignoreNull: true })
        if (record._rel) result._rel = record._rel
        return result
      }

      if (isEmpty(record)) return record
      if (hidden.length > 0) record = omit(record, hidden)
      if (!isArray(fields)) return await transform.call(this, { record, schema, hidden, forceNoHidden })
      const fl = clone(fields)
      if (!fl.includes('id')) fl.unshift('id')
      if (record._rel) fl.push('_rel')
      return pick(await transform.call(this, { record, schema, hidden, forceNoHidden }), fl)
    }

    /**
     * Prepare records pagination:
     * - making sure records limit is obeyed
     * - making sure page is a positive value
     * - if skip is given, recalculate limit to use skip instead of page number
     * - Build sort info
     *
     * @method
     * @async
     * @param {Object} [filter={}] - Filter object
     * @param {Object} schema - Model's schema
     * @param {Object} options - Options
     * @returns {TRecordPagination}
     */
    prepPagination = async (filter = {}, schema, options = {}) => {
      const buildPageSkipLimit = (filter) => {
        let limit = parseInt(filter.limit) || this.config.default.filter.limit
        if (limit === -1) limit = this.config.default.filter.maxLimit
        if (limit > this.config.default.filter.maxLimit) limit = this.config.default.filter.maxLimit
        if (limit < 1) limit = 1
        let page = parseInt(filter.page) || 1
        if (page < 1) page = 1
        let skip = (page - 1) * limit
        if (filter.skip) {
          skip = parseInt(filter.skip) || skip
          page = undefined
        }
        if (skip < 0) skip = 0
        return { page, skip, limit }
      }

      const buildSort = (input, schema, allowSortUnindexed) => {
        const { isEmpty, map, each, isPlainObject, isString, trim, keys } = this.app.lib._
        let sort
        if (schema && isEmpty(input)) {
          const columns = map(schema.properties, 'name')
          each(this.config.default.filter.sort, s => {
            const [col] = s.split(':')
            if (columns.includes(col)) {
              input = s
              return false
            }
          })
        }
        if (!isEmpty(input)) {
          if (isPlainObject(input)) sort = input
          else if (isString(input)) {
            const item = {}
            each(input.split('+'), text => {
              let [col, dir] = map(trim(text).split(':'), i => trim(i))
              dir = (dir ?? '').toUpperCase()
              dir = dir === 'DESC' ? -1 : parseInt(dir) || 1
              item[col] = dir / Math.abs(dir)
            })
            sort = item
          }
          if (schema) {
            const items = keys(sort)
            each(items, i => {
              if (!schema.sortables.includes(i) && !allowSortUnindexed) throw this.error('sortOnUnindexedField%s%s', i, schema.name)
              // if (schema.fullText.fields.includes(i)) throw this.error('Can\'t sort on full-text index: \'%s@%s\'', i, schema.name)
            })
          }
        }
        return sort
      }

      const { page, skip, limit } = buildPageSkipLimit.call(this, filter)
      let sortInput = filter.sort
      try {
        sortInput = JSON.parse(sortInput)
      } catch (err) {}
      const sort = buildSort.call(this, sortInput, schema, options.allowSortUnindexed)
      return { limit, page, skip, sort }
    }

    buildMatch = ({ input = '', schema, options }) => {
      const { isPlainObject, trim } = this.app.lib._
      if (isPlainObject(input)) return input
      const split = (value, schema) => {
        let [field, val] = value.split(':').map(i => i.trim())
        if (!val) {
          val = field
          field = '*'
        }
        return { field, value: val }
      }
      input = trim(input)
      let items = {}
      if (isPlainObject(input)) items = input
      else if (input[0] === '{') items = JSON.parse(input)
      else {
        for (const item of input.split('+').map(i => i.trim())) {
          const part = split(item, schema)
          if (!items[part.field]) items[part.field] = []
          items[part.field].push(...part.value.split(' ').filter(v => ![''].includes(v)))
        }
      }
      const matcher = {}
      for (const f of schema.fullText.fields) {
        const value = []
        if (typeof items[f] === 'string') items[f] = [items[f]]
        if (Object.prototype.hasOwnProperty.call(items, f)) value.push(...items[f])
        matcher[f] = value
      }
      if (Object.prototype.hasOwnProperty.call(items, '*')) matcher['*'] = items['*']
      return matcher
    }

    buildQuery = ({ filter, schema, options = {} } = {}) => {
      const { trim, find, isString, isPlainObject } = this.app.lib._
      let query = {}
      if (isString(filter.query)) {
        try {
          filter.query = trim(filter.query)
          filter.orgQuery = filter.query
          if (trim(filter.query).startsWith('{')) query = JSON.parse(filter.query)
          else if (filter.query.includes(':')) query = nql(filter.query).parse()
          else {
            const fields = schema.sortables.filter(f => {
              const field = find(schema.properties, { name: f, type: 'string' })
              return !!field
            })
            const parts = fields.map(f => {
              if (filter.query[0] === '*') return `${f}:~$'${filter.query.replaceAll('*', '')}'`
              if (filter.query[filter.length - 1] === '*') return `${f}:~^'${filter.query.replaceAll('*', '')}'`
              return `${f}:~'${filter.query.replaceAll('*', '')}'`
            })
            if (parts.length === 1) query = nql(parts[0]).parse()
            else if (parts.length > 1) query = nql(parts.join(',')).parse()
          }
        } catch (err) {
          this.error('invalidQuery', { orgMessage: err.message })
        }
      } else if (isPlainObject(filter.query)) query = filter.query
      return this.sanitizeQuery(query, schema)
    }

    sanitizeQuery = (query, schema, parent) => {
      const { cloneDeep, isPlainObject, isArray, find } = this.app.lib._
      const { isSet } = this.app.lib.aneka
      const { dayjs } = this.app.lib
      const obj = cloneDeep(query)
      const keys = Object.keys(obj)
      const sanitize = (key, val, p) => {
        if (!isSet(val)) return val
        const prop = find(schema.properties, { name: key.startsWith('$') ? p : key })
        if (!prop) return val
        if (['datetime', 'date', 'time'].includes(prop.type)) {
          const dt = dayjs(val)
          return dt.isValid() ? dt.toDate() : val
        } else if (['smallint', 'integer'].includes(prop.type)) return parseInt(val) || val
        else if (['float', 'double'].includes(prop.type)) return parseFloat(val) || val
        else if (['boolean'].includes(prop.type)) return !!val
        return val
      }
      keys.forEach(k => {
        const v = obj[k]
        if (isPlainObject(v)) obj[k] = this.sanitizeQuery(v, schema, k)
        else if (isArray(v)) {
          v.forEach((i, idx) => {
            if (isPlainObject(i)) obj[k][idx] = this.sanitizeQuery(i, schema, k)
          })
        } else obj[k] = sanitize(k, v, parent)
      })
      return obj
    }

    validationErrorMessage = (err) => {
      let text = err.message
      if (err.details) {
        text += ' -> '
        text += this.app.bajo.join(err.details.map((d, idx) => {
          return `${d.field}@${err.model}: ${d.error} (${d.value})`
        }))
      }
      return text
    }

    getInfo = (name) => {
      const schema = this.getSchema(name)
      const connection = this.getConnection(schema.connection)
      const driver = connection.driver
      return { driver, connection, schema }
    }

    getField = (name, model) => {
      const { getInfo } = this.app.dobo
      const { find } = this.app.lib._
      const { schema } = getInfo(model)

      return find(schema.properties, { name })
    }

    hasField = (name, model) => {
      return !!this.getField(name, model)
    }

    getMemdbStorage = (name, fields = []) => {
      const { map, pick } = this.app.lib._
      const all = this.memDb.storage[name] ?? []
      if (fields.length === 0) return all
      return map(all, item => pick(item, fields))
    }

    listAttachments = async ({ model, id = '*', field = '*', file = '*' } = {}, { uriEncoded = true } = {}) => {
      const { map, kebabCase } = this.app.lib._
      const { pascalCase } = this.app.lib.aneka
      const { importPkg, getPluginDataDir } = this.app.bajo
      const mime = await importPkg('waibu:mime')
      const { fastGlob } = this.app.lib
      const root = `${getPluginDataDir('dobo')}/attachment`
      model = pascalCase(model)
      let pattern = `${root}/${model}/${id}/${field}/${file}`
      if (uriEncoded) pattern = pattern.split('/').map(p => decodeURI(p)).join('/')
      return map(await fastGlob(pattern), f => {
        const mimeType = mime.getType(path.extname(f)) ?? ''
        const fullPath = f.replace(root, '')
        const row = {
          file: f,
          fileName: path.basename(fullPath),
          fullPath,
          mimeType,
          params: { model, id, field, file }
        }
        if (this.app.waibuMpa) {
          const { routePath } = this.app.waibu
          const [, _model, _id, _field, _file] = fullPath.split('/')
          row.url = routePath(`dobo:/attachment/${kebabCase(_model)}/${_id}/${_field}/${_file}`)
        }
        return row
      })
    }
  }

  return Dobo
}

export default factory
