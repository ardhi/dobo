import resolveMethod from '../../../lib/resolve-method.js'
import checkUnique from '../../../lib/check-unique.js'
import handleAttachmentUpload from '../../../lib/handle-attachment-upload.js'
import execValidation from '../../../lib/exec-validation.js'
import execFeatureHook from '../../../lib/exec-feature-hook.js'

async function update (name, id, input, opts = {}) {
  const { runHook, isSet } = this.app.bajo
  const { clearColl } = this.cache ?? {}
  const { get, forOwn, find, cloneDeep } = this.app.bajo.lib._
  const options = cloneDeep(opts)
  options.dataOnly = options.dataOnly ?? true
  input = cloneDeep(input)
  const { fields, dataOnly, noHook, noValidation, noCheckUnique, noFeatureHook, noResult, noSanitize, partial = true, hidden } = options
  options.dataOnly = true
  options.truncateString = options.truncateString ?? true
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-update')
  id = this.sanitizeId(id, schema)
  let body = noSanitize ? input : await this.sanitizeBody({ body: input, schema, partial, strict: true })
  delete body.id
  if (!noHook) {
    await runHook(`${this.name}:onBeforeRecordUpdate`, name, id, body, options)
    await runHook(`${this.name}.${name}:onBeforeRecordUpdate`, id, body, options)
  }
  if (!noFeatureHook) await execFeatureHook.call(this, 'beforeUpdate', { schema, body })
  if (!noValidation) body = await execValidation.call(this, { noHook, name, body, options, partial })
  if (!noCheckUnique) await checkUnique.call(this, { schema, body, id })
  let record
  const nbody = {}
  forOwn(body, (v, k) => {
    if (v === undefined) return undefined
    const prop = find(schema.properties, { name: k })
    if (options.truncateString && isSet(v) && prop && ['string', 'text'].includes(prop.type)) v = v.slice(0, prop.maxLength)
    nbody[k] = v
  })
  delete nbody.id
  try {
    record = await handler.call(this.app[driver.ns], { schema, id, body: nbody, options })
    if (options.req) {
      if (options.req.file) await handleAttachmentUpload.call(this, { name: schema.name, id, body, options, action: 'update' })
      if (options.req.flash) options.req.flash('dbsuccess', { message: this.print.write('Record successfully updated'), record })
    }
  } catch (err) {
    if (get(options, 'req.flash')) options.req.flash('dberr', err)
    throw err
  }
  if (!noFeatureHook) await execFeatureHook.call(this, 'afterUpdate', { schema, body: nbody, record })
  if (!noHook) {
    await runHook(`${this.name}.${name}:onAfterRecordUpdate`, id, nbody, options, record)
    await runHook(`${this.name}:onAfterRecordUpdate`, name, id, nbody, options, record)
  }
  if (clearColl) await clearColl({ model: name, id, body: nbody, options, record })
  if (noResult) return
  record.oldData = await this.pickRecord({ record: record.oldData, fields, schema, hidden })
  record.data = await this.pickRecord({ record: record.data, fields, schema, hidden })
  return dataOnly ? record.data : record
}

export default update
