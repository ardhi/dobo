import resolveMethod from '../../../lib/resolve-method.js'
import checkUnique from '../../../lib/check-unique.js'
import handleAttachmentUpload from '../../../lib/handle-attachment-upload.js'
import execValidation from '../../../lib/exec-validation.js'
import execFeatureHook from '../../../lib/exec-feature-hook.js'
import singleRelRows from '../../../lib/single-rel-rows.js'

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
