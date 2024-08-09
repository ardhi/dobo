import resolveMethod from '../../../lib/resolve-method.js'
import checkUnique from '../../../lib/check-unique.js'
import handleAttachmentUpload from '../../../lib/handle-attachment-upload.js'
import execValidation from '../../../lib/exec-validation.js'
import execFeatureHook from '../../../lib/exec-feature-hook.js'

async function create (name, input, opts = {}) {
  const { generateId, runHook, isSet } = this.app.bajo
  const { clearModel } = this.cache ?? {}
  const { get, find, forOwn, cloneDeep, camelCase } = this.app.bajo.lib._
  const options = cloneDeep(opts)
  options.dataOnly = options.dataOnly ?? true
  input = cloneDeep(input)
  const { fields, dataOnly, noHook, noValidation, noCheckUnique, noFeatureHook, noResult, noSanitize, hidden } = options
  options.truncateString = options.truncateString ?? true
  options.dataOnly = false
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-create', options)
  const idField = find(schema.properties, { name: 'id' })
  if (!isSet(input.id)) {
    if (idField.type === 'string') input.id = generateId()
    else if (['integer', 'smallint'].includes(idField.type) && !idField.autoInc) input.id = generateId('int')
  }
  let body = noSanitize ? input : await this.sanitizeBody({ body: input, schema, strict: true })
  if (!noHook) {
    await runHook(`${this.name}:beforeRecordCreate`, name, body, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeRecordCreate`, body, options)
  }
  if (!noFeatureHook) await execFeatureHook.call(this, 'beforeCreate', { schema, body })
  if (!noValidation) body = await execValidation.call(this, { noHook, name, body, options })
  if (isSet(body.id) && !noCheckUnique) await checkUnique.call(this, { schema, body })
  let record = {}
  try {
    const nbody = {}
    forOwn(body, (v, k) => {
      if (v === undefined) return undefined
      const prop = find(schema.properties, { name: k })
      if (options.truncateString && isSet(v) && prop && ['string', 'text'].includes(prop.type)) v = v.slice(0, prop.maxLength)
      nbody[k] = v
    })
    record = await handler.call(this.app[driver.ns], { schema, body: nbody, options })
    if (options.req) {
      if (options.req.file) await handleAttachmentUpload.call(this, { name: schema.name, id: body.id, body, options, action: 'create' })
      if (options.req.flash) options.req.flash('dbsuccess', { message: this.print.write('Record successfully created'), record })
    }
  } catch (err) {
    if (get(options, 'req.flash')) options.req.flash('dberr', err)
    throw err
  }
  if (!noFeatureHook) await execFeatureHook.call(this, 'afterCreate', { schema, body, record })
  if (!noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterRecordCreate`, body, options, record)
    await runHook(`${this.name}:afterRecordCreate`, name, body, options, record)
  }
  if (clearModel) await clearModel({ model: name, body, options, record })
  if (noResult) return
  record.data = await this.pickRecord({ record: record.data, fields, schema, hidden })
  return dataOnly ? record.data : record
}

export default create
