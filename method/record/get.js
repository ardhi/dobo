import resolveMethod from '../../lib/resolve-method.js'
import singleRelRows from '../../lib/single-rel-rows.js'
import execFeatureHook from '../../lib/exec-feature-hook.js'

/**
 * @typedef {Object} TRecordGetResult
 * @see Dobo#recordGet
 * @see Dobo#recordFindOne
 * @property {Object} data - Returned record
 * @property {boolean} success - Whether operation is successfull or failed
 */

/**
 * @typedef {Object} TRecordGetOptions
 * @see Dobo#recordGet
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
 * Get record by model's name and record ID
 *
 * Example:
 * ```javascript
 * const { recordGet } = this.app.dobo
 * const fields = ['id', 'name', 'iso3']
 * const result = await recordGet('CdbCountry', 'ID', { fields })
 * ```
 *
 * @method
 * @memberof Dobo
 * @async
 * @instance
 * @name recordGet
 * @param {string} name - Model's name
 * @param {(string|number)} - Record's ID
 * @param {TRecordGetOptions} [options={}]
 * @returns {(TRecordGetResult|Object)} Return record's ```object``` if ```options.dataOnly``` is set. {@link TRecordGetResult} otherwise
 */

async function get (name, id, opts = {}) {
  const { isSet } = this.lib.aneka
  const { runHook } = this.app.bajo
  const { get, set } = this.cache ?? {}
  const { cloneDeep, camelCase, omit } = this.lib._
  delete opts.record
  const options = cloneDeep(omit(opts, ['req', 'reply']))
  options.req = opts.req
  options.reply = opts.reply
  options.dataOnly = options.dataOnly ?? true
  let { fields, dataOnly, noHook, noCache, noFeatureHook, hidden = [], forceNoHidden } = options
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-get', options)
  if (!schema.cacheable) noCache = true
  id = this.sanitizeId(id, schema)
  options.dataOnly = false
  if (!noHook) {
    await runHook(`${this.name}:beforeRecordGet`, name, id, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeRecordGet`, id, options)
  }
  if (!noFeatureHook) await execFeatureHook.call(this, 'beforeGet', { schema, id, options })
  if (get && !noCache && !options.record) {
    const cachedResult = await get({ model: name, id, options })
    if (cachedResult) {
      cachedResult.cached = true
      if (!noFeatureHook) await execFeatureHook.call(this, 'afterGet', { schema, id, options, record: cachedResult })
      return dataOnly ? cachedResult.data : cachedResult
    }
  }
  const record = options.record ?? (await handler.call(this.app[driver.ns], { schema, id, options }))
  delete options.record
  if (isSet(options.rels)) await singleRelRows.call(this, { schema, record: record.data, options })
  record.data = await this.pickRecord({ record: record.data, fields, schema, hidden, forceNoHidden })
  if (!noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterRecordGet`, id, options, record)
    await runHook(`${this.name}:afterRecordGet`, name, id, options, record)
  }
  if (set && !noCache) await set({ model: name, id, options, record })
  if (!noFeatureHook) await execFeatureHook.call(this, 'afterGet', { schema, id, options, record })
  return dataOnly ? record.data : record
}

export default get
