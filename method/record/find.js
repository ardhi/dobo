import resolveMethod from '../../lib/resolve-method.js'
import multiRelRows from '../../lib/multi-rel-rows.js'
import execFeatureHook from '../../lib/exec-feature-hook.js'

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
 * @property {boolean} [hidden=[]] - Additional fields to hide, in addition the one set in model's schema
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
async function find (name, filter = {}, opts = {}) {
  const { isSet } = this.lib.aneka
  const { runHook } = this.app.bajo
  const { get, set } = this.cache ?? {}
  const { cloneDeep, camelCase, omit } = this.lib._
  delete opts.records
  const options = cloneDeep(omit(opts, ['req', 'reply']))
  options.req = opts.req
  options.reply = opts.reply
  options.dataOnly = options.dataOnly ?? true
  let { fields, dataOnly, noHook, noCache, noFeatureHook, hidden, forceNoHidden } = options
  options.count = options.count ?? false
  options.dataOnly = false
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-find', options)
  if (!schema.cacheable) noCache = true
  filter.query = this.buildQuery({ filter, schema, options }) ?? {}
  if (options.queryHandler) filter.query = await options.queryHandler.call(opts.req ? this.app[opts.req.ns] : this, filter.query, opts.req)
  filter.match = this.buildMatch({ input: filter.match, schema, options }) ?? {}
  if (!noHook) {
    await runHook(`${this.name}:beforeRecordFind`, name, filter, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeRecordFind`, filter, options)
  }
  if (!noFeatureHook) await execFeatureHook.call(this, 'beforeFind', { schema, filter, options })
  if (get && !noCache && !options.records) {
    const cachedResult = await get({ model: name, filter, options })
    if (cachedResult) {
      cachedResult.cached = true
      if (!noFeatureHook) await execFeatureHook.call(this, 'afterFind', { schema, filter, options, records: cachedResult })
      return dataOnly ? cachedResult.data : cachedResult
    }
  }
  const records = options.records ?? (await handler.call(this.app[driver.ns], { schema, filter, options }))
  delete options.records
  if (isSet(options.rels)) await multiRelRows.call(this, { schema, records: records.data, options })
  for (const idx in records.data) {
    records.data[idx] = await this.pickRecord({ record: records.data[idx], fields, schema, hidden, forceNoHidden })
  }
  if (!noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterRecordFind`, filter, options, records)
    await runHook(`${this.name}:afterRecordFind`, name, filter, options, records)
  }
  if (set && !noCache) await set({ model: name, filter, options, records })
  if (!noFeatureHook) await execFeatureHook.call(this, 'afterFind', { schema, filter, options, records })
  return dataOnly ? records.data : records
}

export default find
