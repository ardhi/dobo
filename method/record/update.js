import resolveMethod from '../../lib/resolve-method.js'
import checkUnique from '../../lib/check-unique.js'
import handleAttachmentUpload from '../../lib/handle-attachment-upload.js'
import execValidation from '../../lib/exec-validation.js'
import execFeatureHook from '../../lib/exec-feature-hook.js'
import singleRelRows from '../../lib/single-rel-rows.js'

/**
 * @typedef {Object} TRecordUpdateOptions
 * @see Dobo#recordUpdate
 * @property {boolean} [dataOnly=true] - If ```true``` (default) returns record's object. Otherwise {@link TRecordUpdateResult}
 * @property {boolean} [noHook=false] - If ```true```, no model's hook will be executed
 * @property {boolean} [noFeatureHook=false] - If ```true```, no model's feature hook will be executed
 * @property {boolean} [noValidation=false] - If ```true```, no validation of data payload performed
 * @property {boolean} [noCheckUnique=false] - If ```true```, no unique validation for ID performed
 * @property {boolean} [noSanitize=false] - If ```true```, accept data payload as is without sanitization
 * @property {boolean} [noResult=false] - If ```true```, returns nothing
 * @property {boolean} [truncateString=true] - If ```true``` (default), string is truncated to its schema's ```maxLemngth```
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
async function update (name, id, input, opts = {}) {
  const { isSet } = this.lib.aneka
  const { runHook } = this.app.bajo
  const { clearModel } = this.cache ?? {}
  const { forOwn, find, cloneDeep, camelCase, omit, get } = this.lib._
  delete opts.record
  const options = cloneDeep(omit(opts, ['req', 'reply']))
  options.req = opts.req
  options.reply = opts.reply
  options.dataOnly = options.dataOnly ?? true
  input = cloneDeep(input)
  const { fields, dataOnly, noHook, noValidation, noCheckUnique, noFeatureHook, noResult, noSanitize, partial = true, hidden, forceNoHidden } = options
  options.dataOnly = true
  options.truncateString = options.truncateString ?? true
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-update', options)
  id = this.sanitizeId(id, schema)
  const extFields = get(options, 'validation.extFields', [])
  let body = noSanitize ? input : await this.sanitizeBody({ body: input, schema, partial, strict: true, extFields })
  delete body.id
  if (!noHook) {
    await runHook(`${this.name}:beforeRecordUpdate`, name, id, body, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeRecordUpdate`, id, body, options)
  }
  if (!noValidation) body = await execValidation.call(this, { name, body, options, partial })
  if (!noCheckUnique) await checkUnique.call(this, { schema, body, id })
  const nbody = {}
  forOwn(body, (v, k) => {
    if (v === undefined) return undefined
    const prop = find(schema.properties, { name: k })
    if (!prop) return undefined
    if (options.truncateString && isSet(v) && ['string', 'text'].includes(prop.type)) v = v.slice(0, prop.maxLength)
    nbody[k] = v
  })
  delete nbody.id
  if (!noFeatureHook) await execFeatureHook.call(this, 'beforeUpdate', { schema, body: nbody, options })
  const record = options.record ?? (await handler.call(this.app[driver.ns], { schema, id, body: nbody, options }))
  delete options.record
  if (isSet(options.rels)) await singleRelRows.call(this, { schema, record: record.data, options })
  if (options.req) {
    if (options.req.file) await handleAttachmentUpload.call(this, { name: schema.name, id, body, options, action: 'update' })
    if (options.req.flash && !options.noFlash) options.req.flash('notify', options.req.t('recordUpdated'))
  }
  if (clearModel) await clearModel({ model: name, id, body: nbody, options, record })
  if (noResult) return
  record.oldData = await this.pickRecord({ record: record.oldData, fields, schema, hidden, forceNoHidden })
  record.data = await this.pickRecord({ record: record.data, fields, schema, hidden, forceNoHidden })
  if (!noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterRecordUpdate`, id, nbody, options, record)
    await runHook(`${this.name}:afterRecordUpdate`, name, id, nbody, options, record)
  }
  if (!noFeatureHook) await execFeatureHook.call(this, 'afterUpdate', { schema, body: nbody, record })
  return dataOnly ? record.data : record
}

export default update
