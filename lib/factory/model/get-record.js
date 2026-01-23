import { getFilterAndOptions, execHook, execModelHook, execDynHook, getSingleRef } from './_util.js'
const action = 'getRecord'

/**
 * @typedef {Object} TRecordGetResult
 * @see Dobo#recordGet
 * @see Dobo#recordFindOne
 * @property {Object} data - Returned record
 * @property {boolean} success - Whether operation is successfull or failed
 */

/**
 * @typedef {Object} TRecordgetFilterAndOptions
 * @see Dobo#recordGet
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
 * @param {TRecordgetFilterAndOptions} [options={}]
 * @returns {(TRecordGetResult|Object)} Return record's ```object``` if ```options.dataOnly``` is set. {@link TRecordGetResult} otherwise
 */
async function getRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  let [id, opts = {}] = args
  const { isEmpty } = this.app.lib._
  const { isSet } = this.app.lib.aneka
  const { runHook } = this.app.bajo
  const { dataOnly = true } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  let { noResultSanitizer, noCache } = options
  if (!this.cacheable || !options.record) noCache = true
  id = this.sanitizeId(id)
  await execHook.call(this, 'beforeGetRecord', id, options)
  await execModelHook.call(this, 'beforeGetRecord', id, options)
  await execDynHook.call(this, 'beforeGetRecord', id, options)
  if (!noCache) {
    try {
      await runHook('cache:getById', this, id)
    } catch (err) {
      if (err.code === 'CACHED_RESULT') {
        const result = err.payload
        result.cache = true
        return dataOnly ? result.data : result
      }
    }
  }
  const result = options.record ?? (await this.driver._getRecord(this, id, options)) ?? {}
  if (isEmpty(result.data) && !options.throwNotFound) return dataOnly ? undefined : { data: undefined }
  if (!noResultSanitizer) result.data = await this.sanitizeRecord(result.data, options)
  if (isSet(options.refs)) await getSingleRef.call(this, result.data, options)
  await execDynHook.call(this, 'afterGetRecord', id, result, options)
  await execModelHook.call(this, 'afterGetRecord', id, result, options)
  await execHook.call(this, 'afterGetRecord', id, result, options)
  if (!noCache) await runHook('cache:setById', this, id, result)
  return dataOnly ? result.data : result
}

export default getRecord
