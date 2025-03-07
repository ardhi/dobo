import resolveMethod from '../../../lib/resolve-method.js'
import singleRelRows from '../../../lib/single-rel-rows.js'
import execFeatureHook from '../../../lib/exec-feature-hook.js'

async function get (name, id, opts = {}) {
  const { runHook, isSet } = this.app.bajo
  const { get, set } = this.cache ?? {}
  const { cloneDeep, camelCase, omit } = this.app.bajo.lib._
  delete opts.record
  const options = cloneDeep(omit(opts, ['req', 'reply']))
  options.req = opts.req
  options.reply = opts.reply
  options.dataOnly = options.dataOnly ?? true
  let { fields, dataOnly, noHook, noCache, noFeatureHook, hidden = [], forceNoHidden } = options
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-get', options)
  if (!schema.cacheable) noCache = true
  id = this.sanitizeId(id, schema)
  options.dataOnly = false
  if (!noHook) {
    await runHook(`${this.name}:beforeRecordGet`, name, id, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeRecordGet`, id, options)
  }
  if (!noFeatureHook) await execFeatureHook.call(this, 'beforeGet', { schema, id, options })
  if (get && !noCache && !options.record) {
    const cachedResult = await get({ model: name, id, options })
    if (cachedResult) {
      cachedResult.cached = true
      if (!noFeatureHook) await execFeatureHook.call(this, 'afterGet', { schema, id, options, record: cachedResult })
      return dataOnly ? cachedResult.data : cachedResult
    }
  }
  const record = options.record ?? (await handler.call(this.app[driver.ns], { schema, id, options }))
  delete options.record
  if (isSet(options.rels)) await singleRelRows.call(this, { schema, record: record.data, options })
  if (!noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterRecordGet`, id, options, record)
    await runHook(`${this.name}:afterRecordGet`, name, id, options, record)
  }
  record.data = await this.pickRecord({ record: record.data, fields, schema, hidden, forceNoHidden })

  if (set && !noCache) await set({ model: name, id, options, record })
  if (!noFeatureHook) await execFeatureHook.call(this, 'afterGet', { schema, id, options, record })
  return dataOnly ? record.data : record
}

export default get
