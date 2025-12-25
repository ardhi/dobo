import { getFilterAndOptions, execHook, execModelHook, buildQueryAndMatchFilter, getMultiRefs } from './_util.js'

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
  if (args.length === 0) return this.action('findRecord', ...args)
  const [params = {}, opts = {}] = args
  const { isSet } = this.app.lib.aneka
  const { runHook } = this.app.bajo
  const { dataOnly = true } = opts
  const { filter, options } = getFilterAndOptions.call(this, params, opts)
  if (dataOnly) options.count = false
  let { noResultSanitizer, noCache } = options
  if (!this.cacheable || !options.record) noCache = true
  await buildQueryAndMatchFilter.call(this, filter, options)
  if (!noCache) {
    try {
      await runHook('cache:getByFilter', this, filter)
    } catch (err) {
      if (err.code === 'CACHED_RESULT') {
        const result = err.payload
        result.cache = true
        return dataOnly ? result.data : result
      }
    }
  }
  await execHook.call(this, 'beforeFindRecord', filter, options)
  await execModelHook.call(this, 'beforeFindRecord', filter, options)
  const result = options.record ?? (await this.driver._findRecord(this, filter, options)) ?? {}
  if (!noResultSanitizer) {
    for (const idx in result.data) {
      result.data[idx] = await this.sanitizeRecord(result.data[idx], options)
    }
  }
  if (isSet(options.refs)) await getMultiRefs.call(this, { records: result.data, options })
  await execModelHook.call(this, 'afterFindRecord', filter, result, options)
  await execHook.call(this, 'afterFindRecord', filter, result, options)
  if (!noCache) await runHook('cache:setByFilter', this, filter, result)
  return dataOnly ? result.data : result
}

export default findRecord
