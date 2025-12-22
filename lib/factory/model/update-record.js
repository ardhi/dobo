import { getFilterAndOptions, execHook, execValidation, execModelHook, getSingleRef, handleReq } from './_util.js'

/**
 * @typedef {Object} TRecordUpdateOptions
 * @see Model#updateRecord
 * @property {boolean} [dataOnly=true] - If ```true``` (default) returns record's object. Otherwise {@link TRecordUpdateResult}
 * @property {boolean} [noHook=false] - If ```true```, no model's hook will be executed
 * @property {boolean} [noModelHook=false] - If ```true```, no model's hook will be executed
 * @property {boolean} [noValidation=false] - If ```true```, no validation of data payload performed
 * @property {boolean} [noCheckUnique=false] - If ```true```, no unique validation for ID performed
 * @property {boolean} [noBodySanitizer=false] - If ```true```, accept data payload as is without sanitization
 * @property {boolean} [noRecordSanitizer=false] - If ```true```, accept result payload as is without sanitization
 * @property {boolean} [noResult=false] - If ```true```, returns nothing
 * @property {boolean} [truncateString=true] - If ```true``` (default), string is truncated to its schema's ```maxLength```
 * @property {boolean} [partial=true] - If ```true``` (default), only updated values are saved. Otherwise replace all existing values with given payload
 * @property {boolean} [fields=[]] - If not empty, return only these fields EXCLUDING hidden fields
 * @property {boolean} [hidden=[]] - Additional fields to hide, in addition the one set in model's schema
 * @property {boolean} [forceNoHidden=false] - If ```true```, hidden fields will be ignored and ALL fields will be returned
 */

/**
 * Update a record by it's ID and body payload
 *
 * Example:
 * ```javascript
 * const { recordUpdate } = this.app.dobo
 * const { body } = {
 *   name: 'Republic of Indonesia',
 *   phoneCode: '+62'
 * }
 * const result = await recordUpdate('CdbCountry', 'ID', body)
 * ```
 *
 * @method
 * @memberof Dobo
 * @async
 * @instance
 * @name recordUpdate
 * @param {string} name - Model's name
 * @param {(string|number)} id - Record's ID
 * @param {Object} body - Body payload
 * @param {TRecordUpdateOptions} [options={}]
 * @returns {(TRecordUpdateResult|Object)} Returns updated record if ```options.dataOnly``` is set. {@link TRecordUpdateResult} otherwise
 */
async function updateRecord (...args) {
  if (args.length === 0) return this.action('updateRecord', ...args)
  let [id, body = {}, opts = {}] = args
  const { isSet } = this.app.lib.aneka
  const { runHook } = this.app
  const { cloneDeep, get } = this.app.lib._
  const { dataOnly = true } = opts
  const { options } = getFilterAndOptions.call(this, null, opts)
  options.partial = options.partial ?? true
  const { truncateString, noResult, noBodySanitizer, noResultSanitizer, noValidation } = options
  const extFields = get(options, 'validation.extFields', [])
  id = this.sanitizeId(id)
  let input = noBodySanitizer ? cloneDeep(body) : await this.sanitizeBody({ body, extFields, strict: true, truncateString })
  delete input.id
  if (!noValidation) input = await execValidation.call(this, input, options)
  await execHook.call(this, 'beforeUpdateRecord', id, input, options)
  await execModelHook.call(this, 'beforeUpdateRecord', id, input, options)
  const result = options.record ?? (await this.driver._updateRecord(this, id, input, options))
  if (noResult) {
    await runHook('cache:clear', this, 'update', id, body)
    return
  }
  if (!noResultSanitizer) {
    result.data = await this.sanitizeRecord(result.data, options)
    result.oldData = await this.sanitizeRecord(result.oldData, options)
  }
  if (isSet(options.refs)) await getSingleRef.call(this, { record: result.data, options })
  await handleReq.call(this, result.data.id, 'updated', options)
  await execModelHook.call(this, 'afterUpdateRecord', id, input, result, options)
  await execHook.call(this, 'afterUpdateRecord', id, input, result, options)
  await runHook('cache:clear', this, 'update', id, body, result)
  return dataOnly ? result.data : result
}

export default updateRecord
