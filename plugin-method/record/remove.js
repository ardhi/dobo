import resolveMethod from '../../lib/resolve-method.js'
import handleAttachmentUpload from '../../lib/handle-attachment-upload.js'
import execFeatureHook from '../../lib/exec-feature-hook.js'

async function remove (name, id, opts = {}) {
  const { runHook } = this.app.bajo
  const { clearModel } = this.cache ?? {}
  const { cloneDeep, camelCase, omit } = this.lib._
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
    await runHook(`${this.name}:beforeRecordRemove`, name, id, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeRecordRemove`, id, options)
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
    await runHook(`${this.name}.${camelCase(name)}:afterRecordRemove`, id, options, record)
    await runHook(`${this.name}:afterRecordRemove`, name, id, options, record)
  }
  if (!noFeatureHook) await execFeatureHook.call(this, 'afterRemove', { schema, id, options, record })
  return dataOnly ? record.oldData : record
}

export default remove
