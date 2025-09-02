import resolveMethod from '../../lib/resolve-method.js'
import handleAttachmentUpload from '../../lib/handle-attachment-upload.js'
import execFeatureHook from '../../lib/exec-feature-hook.js'

/**
 * @typedef {Object} TRecordRemoveOptions
 * @see Dobo#recordRemove
 * @property {boolean} [dataOnly=true] - If ```true``` (default) returns deleted record. Otherwise {@link TRecordRemoveResult}
 * @property {boolean} [noHook=false] - If ```true```, no model's hook will be executed
 * @property {boolean} [noFeatureHook=false] - If ```true```, no model's feature hook will be executed
 * @property {boolean} [noResult=false] - If ```true```, returns nothing
 * @property {boolean} [fields=[]] - If not empty, return only these fields EXCLUDING hidden fields
 * @property {boolean} [hidden=[]] - Additional fields to hide, in addition the one set in model's schema
 * @property {boolean} [forceNoHidden=false] - If ```true```, hidden fields will be ignored and ALL fields will be returned
 */

/**
 * Remove existing record by it's ID. All attachments bound to this record will also be removed forever.
 *
 * Example:
 * ```javascript
 * const { recordRemove } = this.app.dobo
 * const result = await recordRemove('CdbCountry', 'ID')
 * ```
 *
 * @method
 * @memberof Dobo
 * @async
 * @instance
 * @name recordRemove
 * @param {string} name - Model's name
 * @param {(string|number)} id - Record's ID
 * @param {TRecordRemoveOptions} [options={}]
 * @returns {(TRecordRemoveResult|Object)} Return the removed record if ```options.dataOnly``` is set. {@link TRecordRemoveResult} otherwise
 */
async function remove (name, id, opts = {}) {
  const { runHook } = this.app.bajo
  const { clearModel } = this.cache ?? {}
  const { cloneDeep, camelCase, omit } = this.app.lib._
  delete opts.record
  const options = cloneDeep(omit(opts, ['req', 'reply']))
  options.req = opts.req
  options.reply = opts.reply
  options.dataOnly = options.dataOnly ?? true
  const { fields, dataOnly, noHook, noResult, noFeatureHook, hidden, forceNoHidden } = options
  options.dataOnly = false
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-remove', options)
  id = this.sanitizeId(id, schema)
  if (!noHook) {
    await runHook(`${this.ns}:beforeRecordRemove`, name, id, options)
    await runHook(`${this.ns}.${camelCase(name)}:beforeRecordRemove`, id, options)
  }
  if (!noFeatureHook) await execFeatureHook.call(this, 'beforeRemove', { schema, id, options })
  const record = options.record ?? (await handler.call(this.app[driver.ns], { schema, id, options }))
  delete options.record
  if (options.req) {
    if (options.req.file) await handleAttachmentUpload.call(this, { name: schema.name, id, options, action: 'remove' })
    if (options.req.flash && !options.noFlash) options.req.flash('notify', options.req.t('recordRemoved'))
  }
  if (clearModel) await clearModel({ model: name, id, options, record })
  if (noResult) return
  record.oldData = options.record ? options.record.oldData : (await this.pickRecord({ record: record.oldData, fields, schema, hidden, forceNoHidden }))
  if (!noHook) {
    await runHook(`${this.ns}.${camelCase(name)}:afterRecordRemove`, id, options, record)
    await runHook(`${this.ns}:afterRecordRemove`, name, id, options, record)
  }
  if (!noFeatureHook) await execFeatureHook.call(this, 'afterRemove', { schema, id, options, record })
  return dataOnly ? record.oldData : record
}

export default remove
