import resolveMethod from '../../lib/resolve-method.js'
import execFeatureHook from '../../lib/exec-feature-hook.js'

/**
 * @typedef {Object} TRecordCountOptions
 * @see Dobo#recordCount
 * @property {boolean} [dataOnly=true] - If ```true``` (default) returns array of records. Otherwise {@link TFindRecordResult}
 * @property {boolean} [noCache=true] - If ```true``` (default), result set won't be cached. This will overwrite model's ```cacheable``` property. Only applicable if {@link https://github.com/ardhi/bajo-cache|bajo-cache} is loaded
 * @property {boolean} [noHook=false] - If ```true```, no model's hook will be executed
 * @property {boolean} [noFeatureHook=false] - If ```true```, no model's feature hook will be executed
 */

/**
 * Return the number of records found by given filter
 *
 * @method
 * @memberof Dobo
 * @async
 * @instance
 * @name recordCount
 * @param {string} name - Model's name
 * @param {TRecordFilter} [filter={}] - Filter object
 * @param {TRecordCountOptions} [options={}]
 * @returns {(TRecordCountResult|number)} Return ```number``` of records if ```options.dataOnly``` is set. {@link TRecordCountResult} otherwise
 */
async function count (name, filter = {}, opts = {}) {
  const { runHook } = this.app.bajo
  const { get, set } = this.cache ?? {}
  const { cloneDeep, camelCase, omit } = this.app.lib._
  delete opts.record
  const options = cloneDeep(omit(opts, ['req', 'reply']))
  options.req = opts.req
  options.reply = opts.reply
  options.dataOnly = options.dataOnly ?? true
  let { dataOnly, noHook, noCache, noFeatureHook } = options
  options.dataOnly = false
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-count', options)
  if (!schema.cacheable) noCache = true
  filter.query = this.buildQuery({ filter, schema, options }) ?? {}
  if (options.queryHandler) filter.query = await options.queryHandler.call(opts.req ? this.app[opts.req.ns] : this, filter.query, opts.req)
  filter.match = this.buildMatch({ input: filter.match, schema, options }) ?? {}
  if (!noHook) {
    await runHook(`${this.ns}:beforeRecordCount`, name, filter, options)
    await runHook(`${this.ns}.${camelCase(name)}:beforeRecordCount`, filter, options)
  }
  if (!noFeatureHook) await execFeatureHook.call(this, 'beforeCount', { schema, filter, options })
  if (get && !noCache && !options.record) {
    const cachedResult = await get({ model: name, filter, options })
    if (cachedResult) {
      cachedResult.cached = true
      return dataOnly ? cachedResult.data : cachedResult
    }
  }
  const record = options.record ?? (await handler.call(this.app[driver.ns], { schema, filter, options }))
  delete options.record
  if (!noHook) {
    await runHook(`${this.ns}.${camelCase(name)}:afterRecordCount`, filter, options, record)
    await runHook(`${this.ns}:afterRecordCount`, name, filter, options, record)
  }
  if (set && !noCache) await set({ model: name, filter, options, record })
  if (!noFeatureHook) await execFeatureHook.call(this, 'afterCount', { schema, filter, options, record })
  return dataOnly ? record.data : record
}

export default count
