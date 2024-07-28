import resolveMethod from '../../../lib/resolve-method.js'
import handleAttachmentUpload from '../../../lib/handle-attachment-upload.js'

async function remove (name, id, opts = {}) {
  const { runHook } = this.app.bajo
  const { clearColl } = this.cache ?? {}
  const { cloneDeep } = this.app.bajo.lib._
  const options = cloneDeep(opts)
  options.dataOnly = options.dataOnly ?? true
  const { fields, dataOnly, noHook, noResult, hidden } = options
  options.dataOnly = false
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-remove')
  id = this.sanitizeId(id, schema)
  if (!noHook) {
    await runHook(`${this.name}:onBeforeRecordRemove`, name, id, options)
    await runHook(`${this.name}.${name}:onBeforeRecordRemove`, id, options)
  }
  const record = await handler.call(this.app[driver.ns], { schema, id, options })
  if (options.req) {
    if (options.req.file) await handleAttachmentUpload.call(this, { name: schema.name, id, options, action: 'remove' })
    if (options.req.flash) options.req.flash('dbsuccess', { message: this.print.write('Record successfully removed'), record })
  }
  if (!noHook) {
    await runHook(`${this.name}.${name}:onAfterRecordRemove`, id, options, record)
    await runHook(`${this.name}:onAfterRecordRemove`, name, id, options, record)
  }
  if (clearColl) await clearColl({ model: name, id, options, record })
  if (noResult) return
  record.oldData = await this.pickRecord({ record: record.oldData, fields, schema, hidden })
  return dataOnly ? record.oldData : record
}

export default remove