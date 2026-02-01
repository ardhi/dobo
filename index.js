import collectConnections from './lib/collect-connections.js'
import collectDrivers from './lib/collect-drivers.js'
import collectFeatures from './lib/collect-features.js'
import collectModels from './lib/collect-models.js'

/**
 * @typedef {Object} TPropertyType
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
const propertyType = {
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
  datetime: {
    validator: 'date',
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

const commonPropertyTypes = ['name', 'type', 'required', 'rules', 'validator', 'ref', 'default']

/**
 * Plugin factory
 *
 * @param {string} pkgName - NPM package name
 * @returns {class}
 */
async function factory (pkgName) {
  const me = this
  const { breakNsPath } = this.app.bajo

  const { find, filter, isString, map, pick, groupBy, isEmpty } = this.app.lib._

  /**
   * Dobo Database Framework for {@link https://github.com/ardhi/bajo|Bajo}.
   *
   * See {@tutorial ecosystem} for available drivers & tools
   *
   * @class
   */
  class Dobo extends this.app.baseClass.Base {
    /**
     * @constant {string[]}
     * @memberof Dobo
     * @default ['count', 'avg', 'min', 'max', 'sum']
     */
    static aggregateTypes = ['count', 'avg', 'min', 'max', 'sum']

    /**
     * @constant {string[]}
     * @memberof Dobo
     * @default ['string', 'integer', 'smallint']
     */
    static idTypes = ['string', 'integer', 'smallint']

    /**
     * @constant {string[]}
     * @memberof Dobo
     * @default ['daily', 'monthly', 'annually']
     */
    static histogramTypes = ['daily', 'monthly', 'yearly']

    /**
     * @constant {TPropertyType}
     * @memberof Dobo
     */
    static propertyType = propertyType

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
      this.models = []
    }

    /**
     * Get allowed property keys by field type
     *
     * @param {string} type
     * @returns {string[]}
     */
    getPropertyKeysByType = (type) => {
      const keys = [...commonPropertyTypes]
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

    getAllPropertyKeys = (driver) => {
      const { uniq, isEmpty } = this.app.lib._
      const keys = [...commonPropertyTypes]
      for (const type in propertyType) {
        keys.push(...Object.keys(propertyType[type]))
      }
      if (driver && !isEmpty(driver.constructor.propertyKeys)) keys.push(...driver.constructor.propertyKeys)
      return uniq(keys)
    }

    /**
     * Initialize plugin and performing the following tasks:
     * - {@link module:Lib.collectDrivers|Collecting all drivers}
     * - {@link module:Lib.collectConnections|Collecting all connections}
     * - {@link module:Lib.collectFeatures|Collecting all features}
     * - {@link module:Lib.collectModels|Collecting all models}
     * @method
     * @async
     */
    init = async () => {
      const { getPluginDataDir } = this.app.bajo
      const { fs } = this.app.lib
      await collectDrivers.call(this)
      await collectConnections.call(this)
      await collectFeatures.call(this)
      await collectModels.call(this)
      const attDir = `${getPluginDataDir('dobo')}/attachment`
      fs.ensureDirSync(attDir)
    }

    /**
     * Start plugin
     *
     * @method
     * @async
     * @param {(string|Array)} [conns=all] - Which connections should be run on start
     * @param {boolean} [noRebuild=true] - Set ```false``` to not rebuild model on start. Yes, only set it to ```false``` if you REALLY know what you're doing!!!
     */
    start = async (conns = 'all', noRebuild = true) => {
      if (conns === 'all') conns = this.connections
      else if (isString(conns)) conns = filter(this.connections, { name: conns })
      else conns = map(conns, c => find(this.connections, { name: c }))
      this.log.debug('dbInit')
      for (const connection of conns) {
        await connection.connect(noRebuild)
        this.log.trace('dbInit%s%s%s', connection.driver.plugin.ns, connection.driver.name, connection.name)
      }
    }

    /**
     * Get connection by name. It returns the first connection named after "{name}"
     *
     * @param {string} name - Connection name
     * @param {boolean} [silent] - If ```true``` and connection is not found, it won't throw error
     * @returns {Driver} Return connection instance or ```undefined``` if silent is ```true```
     */
    getConnection = (name, silent) => {
      const conn = find(this.connections, { name })
      if (!conn && !silent) throw this.error('unknown%s%s', this.t('connection'), name)
      return conn
    }

    /**
     * Get driver by name. It returns the first driver named after "{name}"
     *
     * Also support NsPath format for those who load the same named driver but from different provider/plugin.
     *
     * @param {string} name - Driver name
     * @param {boolean} [silent] - If ```true``` and driver is not found, it won't throw error
     * @returns {Driver} Returns driver instance or ```undefined``` if silent is ```true```
     */
    getDriver = (name, silent) => {
      const { breakNsPath } = this.app.bajo
      let driver
      if (!name.includes(':')) {
        driver = find(this.drivers, { name })
        if (driver) return driver
        driver = filter(this.drivers, d => d.plugin.ns === name)
        if (driver.length === 1) return driver[0]
        if (!silent) throw this.error('unknown%s%s', this.t('driver'), name)
        return
      }
      const { ns, path } = breakNsPath(name)
      driver = find(this.drivers, d => d.name === path && d.plugin.ns === ns)
      if (!driver && !silent) throw this.error('unknown%s%s', this.t('driver'), name)
      return driver
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
      const feat = find(this.features, d => d.name === path && d.plugin.ns === ns)
      if (!feat) throw this.error('unknown%s%s', this.t('feature'), name)
      return feat
    }

    /**
     * Get model by name
     *
     * @param {string} name - Model name
     * @param {boolean} [silent] - If ```true``` and model is not found, it won't throw error
     * @retuns {Model} Returns model instance or ```undefined``` if silent is ```true```
     */
    getModel = (name, silent) => {
      const { pascalCase } = this.app.lib.aneka
      let model = find(this.models, { name })
      if (!model) model = find(this.models, { name: pascalCase(name) })
      if (!model && !silent) throw this.error('unknown%s%s', this.t('model'), name)
      return model
    }

    /**
     * Get all models that bound to connection ```name```
     *
     * @param {string} name - Connection name
     * @returns {Array}
     */
    getModelsByConnection = name => {
      const conn = this.getConnection(name)
      return this.models.filter(s => s.connection.name === conn.name)
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

    /**
     * Sanitize value as a date/time value. Parse/format string using {@link https://day.js.org/docs/en/display/format|dayjs format}
     *
     * @method
     * @memberof Dobo
     * @param {(number|string)} value - Value to sanitize
     * @param {Object} [options={}] - Options object
     * @param {boolean} [options.silent=true] - If ```true``` (default) and value isn't valid, returns empty
     * @param {string} [options.inputFormat] - If provided, parse value using this option
     * @param {string} [options.outputFormat] - If not provided or ```native```, returns Javascript Date. Otherwise returns formatted date/time string
     * @returns {(string|Date)}
     */
    sanitizeDate = (value, { inputFormat, outputFormat, silent = true } = {}) => {
      const { dayjs } = this.app.lib
      if (value === 0) return null
      if (!outputFormat) outputFormat = inputFormat
      const dt = dayjs(value, inputFormat)
      if (!dt.isValid()) {
        if (silent) return null
        throw this.error('invalidDate')
      }
      if (outputFormat === 'native' || !outputFormat) return dt.toDate()
      return dt.format(outputFormat)
    }

    sanitizeFloat = (value, { strict = false } = {}) => {
      const { isNumber } = this.app.lib._
      if (isNumber(value)) return value
      if (strict) return Number(value)
      return parseFloat(value) || null
    }

    sanitizeInt = (value, { strict = false } = {}) => {
      const { isNumber } = this.app.lib._
      if (isNumber(value)) return value
      if (strict) return Number(value)
      return parseInt(value) || null
    }

    sanitizeObject = (value) => {
      const { isString } = this.app.lib._
      let result = null
      if (isString(value)) {
        try {
          result = JSON.parse(value)
        } catch (err) {}
      } else {
        try {
          result = JSON.parse(JSON.stringify(value))
        } catch (err) {}
      }
      return result
    }

    sanitizeBoolean = (value) => {
      return value === null ? null : (['true', true].includes(value))
    }

    sanitizeTimestamp = (value) => {
      const { isNumber } = this.app.lib._
      const { dayjs } = this.app.lib
      if (!isNumber(value)) return -1
      const dt = dayjs.unix(value)
      return dt.isValid() ? dt.unix() : -1
    }

    sanitizeString = (value) => {
      return value + ''
    }

    _calcStats = (items, field, aggregates) => {
      const { generateId, isSet } = this.app.lib.aneka
      const result = { id: generateId, count: 0, avg: null, min: null, max: null }
      let sum = 0
      for (const item of items) {
        const value = Number(item[field]) ?? 0
        if (aggregates.includes('count')) result.count++
        if (aggregates.includes('avg')) sum = sum + value
        if (aggregates.includes('min') && (!isSet(result.min) || value < result.min)) result.min = value
        if (aggregates.includes('max') && (!isSet(result.max) || value > result.max)) result.max = value
      }
      result.avg = sum / items.length
      return result
    }

    calcAggregate = ({ data = [], group = '', field = '', aggregates = ['count'] } = {}) => {
      this.checkAggregateParams({ group, field, aggregates })
      const { pick, groupBy } = this.app.lib._
      const grouped = groupBy(data, group)
      const all = []
      for (const key in grouped) {
        const items = grouped[key]
        const result = this._calcStats(items, field, aggregates)
        result[group] = key
        all.push(pick(result, ['id', group, ...aggregates]))
      }
      return all
    }

    calcHistogram = ({ data = [], type = '', group = '', field = '', aggregates = ['count'] } = {}) => {
      this.checkHistogramParams({ group, field, type, aggregates })
      const { dayjs } = this.app.lib
      const pattern = { daily: ['YYYY-MM-DD', 'date'], monthly: ['YYYY-MM', 'month'], yearly: ['YYYY', 'year'] }
      for (const d of data) {
        d._group = dayjs(d[group]).format(pattern[type][0])
      }
      const grouped = groupBy(data, '_group')
      const all = []
      for (const key in grouped) {
        const items = grouped[key]
        const result = this._calcStats(items, field, aggregates)
        const title = pattern[type][1]
        result[title] = key
        all.push(pick(result, ['id', title, ...aggregates]))
      }
      return all
    }

    checkAggregateParams = (params = {}) => {
      let { group, field, aggregates } = params
      if (isString(aggregates)) aggregates = [aggregates]
      params.aggregates = aggregates
      if (isEmpty(group)) throw this.error('fieldGroupMissing')
      if (isEmpty(field)) throw this.error('fieldCalcMissing')
      for (const agg of aggregates) {
        if (!this.constructor.aggregateTypes.includes(agg)) throw this.error('unsupportedAggregateType%s', agg)
      }
    }

    checkHistogramParams = (params = {}) => {
      this.checkAggregateParams(params)
      const { type } = params
      if (isEmpty(type)) throw this.error('histogramTypeMissing')
      if (!this.constructor.histogramTypes.includes(type)) throw this.error('unsupportedHistogramType%s', type)
    }

    runModelHook = async (model, hookName, ...args) => {
      const { orderBy } = this.app.lib._
      const hooks = orderBy(model.hooks.filter(hook => hook.name === hookName), ['level'])
      for (const hook of hooks) {
        if (hook.noWait) hook.handler.call(model, ...args)
        else await hook.handler.call(model, ...args)
      }
    }
  }

  return Dobo
}

export default factory
