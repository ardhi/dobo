import { getFilterAndOptions, execHook, execModelHook, execDynHook, getMultiRefs } from './_util.js'
const action = 'findRecord'

/**
 * @typedef {Object} TRecordFilter
 * @see Dobo#recordFind
 * @see Dobo#recordFindOne
 * @see Dobo#recordFindAll
 * @property {(string|Object)} [query={}] - Query definition. See {@tutorial query-language} for more
 * @property {number} limit - Max number of records per page
 * @property {number} page - Which page is the returned records currently at
 * @property {number} skip - Records to skip
 * @property {TRecordSort} sort - Sort order info
 */

/**
 * @typedef {Object} TRecordFindResult
 * @see Dobo#recordFind
 * @see Dobo#recordFindAll
 * @see Dobo#recordGet
 * @property {Array.<Object>} data - Array of returned records
 * @property {boolean} success - Whether operation is successfull or failed
 * @property {number} page - Which page is the returned records currently at
 * @property {number} limit - Max number of records per page
 * @property {number} count - Total number of records returned
 * @property {number} pages - Total number of pages returned
 */

/**
 * @typedef {Object} TRecordFindOptions
 * @see Dobo#recordFind
 * @see Dobo#recordFindOne
 * @see Dobo#recordFindAll
 * @property {boolean} [dataOnly=true] - If ```true``` (default) returns array of records. Otherwise {@link TFindRecordResult}
 * @property {boolean} [count=false] - If ```true``` and ```dataOnly``` is also ```true```, the total number of records found will be returned
 * @property {boolean} [noCache=true] - If ```true``` (default), result set won't be cached. This will overwrite model's ```cacheable``` property. Only applicable if {@link https://github.com/ardhi/bajo-cache|bajo-cache} is loaded
 * @property {boolean} [noHook=false] - If ```true```, no model's hook will be executed
 * @property {boolean} [noFeatureHook=false] - If ```true```, no model's feature hook will be executed
 * @property {boolean} [fields=[]] - If not empty, return only these fields EXCLUDING hidden fields
 * @property {boolean} [hidden=[]] - Additional fields to hide, in addition the one set in model's model
 * @property {boolean} [forceNoHidden=false] - If ```true```, hidden fields will be ignored and ALL fields will be returned
 */

/**
 * Find records by model's name and given filter
 *
 * Example: find records from model **CdbCountry** where its id is 'ID' or 'MY',
 * sorted by ```name``` in ascending order and return only its ```id```, ```name``` and ```iso3```
 * ```javascript
 * const { recordFind } = this.app.dobo
 * const query = { id: { $in: ['ID', 'MY'] } }
 * const sort = { name: 1 }
 * const fields = ['id', 'name', 'iso3']
 * const result = await recordFind('CdbCountry', { query, sort }, { fields })
 * ```
 *
 * @method
 * @memberof Dobo
 * @async
 * @instance
 * @name recordFind
 * @param {string} name - Model's name
 * @param {Object} [filter={}] - Filter object
 * @param {TRecordFindOptions} [options={}]
 * @returns {(TRecordFindResult|Array.<Object>)} Return ```array``` of records if ```options.dataOnly``` is set. {@link TRecordFindResult} otherwise
 */
async function findRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const { getDefaultValues, t } = this.app.dobo
  const [params = {}, opts = {}] = args
  const { isSet } = this.app.lib.aneka
  const { pick, omit, cloneDeep } = this.app.lib._
  const { get, set } = this.app.bajoCache ?? {}
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { filter, options } = await getFilterAndOptions.call(this, params, opts, action)
  const { hardCap, warnings } = getDefaultValues(options)
  if (dataOnly) options.count = false
  const { noResultSanitizer } = options
  await execHook.call(this, 'beforeFindRecord', filter, options)
  await execModelHook.call(this, 'beforeFindRecord', filter, options)
  await execDynHook.call(this, 'beforeFindRecord', filter, options)
  const cFilter = cloneDeep(filter)
  if (get) {
    const resp = await get({ model: this, action, filter: cFilter, options })
    if (resp) {
      resp.cached = true
      return dataOnly ? resp.data : resp
    }
  }
  let result = options.record ?? (await this.driver._findRecord(this, filter, options)) ?? {}
  result.page = filter.page
  result.limit = filter.limit
  result.filter = pick(filter, ['query', 'search', 'sort'])
  result.warnings = result.warnings ?? []
  if (!options.count) result = omit(result, ['count', 'pages'])
  else if (options.count && result.count > hardCap) {
    result.warnings.push(t('hardCapWarning%s%s', result.count, hardCap))
    result.count = hardCap
    result.hardCapped = true
  }
  result.pages = options.count ? Math.ceil(result.count / filter.limit) : undefined
  if (!warnings) delete result.warnings
  if (isSet(options.refs)) await getMultiRefs.call(this, result.data, options)
  if (!noResultSanitizer) {
    for (const idx in result.data) {
      result.data[idx] = await this.sanitizeRecord(result.data[idx], options)
    }
  }
  await execDynHook.call(this, 'afterFindRecord', filter, result, options)
  await execModelHook.call(this, 'afterFindRecord', filter, result, options)
  await execHook.call(this, 'afterFindRecord', filter, result, options)
  if (set) await set({ model: this, action, filter: cFilter, options, result })
  return dataOnly ? result.data : result
}

export default findRecord
