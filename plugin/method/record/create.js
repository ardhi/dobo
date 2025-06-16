import crypto from 'crypto'
import resolveMethod from '../../../lib/resolve-method.js'
import checkUnique from '../../../lib/check-unique.js'
import handleAttachmentUpload from '../../../lib/handle-attachment-upload.js'
import execValidation from '../../../lib/exec-validation.js'
import execFeatureHook from '../../../lib/exec-feature-hook.js'
import singleRelRows from '../../../lib/single-rel-rows.js'

async function create (name, input, opts = {}) {
  const { generateId, runHook } = this.app.bajo
  const { isSet } = this.lib.aneka
  const { clearModel } = this.cache ?? {}
  const { find, forOwn, cloneDeep, camelCase, omit, get, pick } = this.lib._
  delete opts.record
  const options = cloneDeep(omit(opts, ['req', 'reply']))
  options.req = opts.req
  options.reply = opts.reply
  options.dataOnly = options.dataOnly ?? true
  input = cloneDeep(input)
  const { fields, dataOnly, noHook, noValidation, noCheckUnique, noFeatureHook, noResult, noSanitize, hidden, forceNoHidden } = options
  options.truncateString = options.truncateString ?? true
  options.dataOnly = false
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-create', options)
  const idField = find(schema.properties, { name: 'id' })
  const extFields = get(options, 'validation.extFields', [])
  let body = noSanitize ? cloneDeep(input) : await this.sanitizeBody({ body: input, schema, extFields, strict: true })
  if (!noHook) {
    await runHook(`${this.name}:beforeRecordCreate`, name, body, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeRecordCreate`, body, options)
  }
  if (!isSet(body.id)) {
    if (idField.type === 'string') {
      if (!options.checksumId) body.id = generateId()
      else {
        if (options.checksumId === true) options.checksumId = Object.keys(body)
        const checksum = pick(body, options.checksumId)
        body.id = crypto.createHash('md5').update(JSON.stringify(checksum)).digest('hex')
      }
    } else if (['integer', 'smallint'].includes(idField.type) && !idField.autoInc) input.id = generateId('int')
  }
  if (!noValidation) body = await execValidation.call(this, { name, body, options })
  if (isSet(body.id) && !noCheckUnique) await checkUnique.call(this, { schema, body })
  const nbody = {}
  forOwn(body, (v, k) => {
    if (v === undefined) return undefined
    const prop = find(schema.properties, { name: k })
    if (!prop) return undefined
    if (options.truncateString && isSet(v) && ['string', 'text'].includes(prop.type)) v = v.slice(0, prop.maxLength)
    nbody[k] = v
  })
  if (!noFeatureHook) await execFeatureHook.call(this, 'beforeCreate', { schema, body: nbody, options })
  const record = options.record ?? (await handler.call(this.app[driver.ns], { schema, body: nbody, options }))
  delete options.record
  if (isSet(options.rels)) await singleRelRows.call(this, { schema, record: record.data, options })
  if (options.req) {
    if (options.req.file) await handleAttachmentUpload.call(this, { name: schema.name, id: body.id, body, options, action: 'create' })
    if (options.req.flash && !options.noFlash) options.req.flash('notify', options.req.t('recordCreated'))
  }
  if (clearModel) await clearModel({ model: name, body: nbody, options, record })
  if (noResult) return
  record.data = await this.pickRecord({ record: record.data, fields, schema, hidden, forceNoHidden })
  if (!noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterRecordCreate`, nbody, options, record)
    await runHook(`${this.name}:afterRecordCreate`, name, nbody, options, record)
  }
  if (!noFeatureHook) await execFeatureHook.call(this, 'afterCreate', { schema, body: nbody, options, record })
  return dataOnly ? record.data : record
}

export default create
