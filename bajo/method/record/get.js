import resolveMethod from '../../../lib/resolve-method.js'
import singleRelRows from '../../../lib/single-rel-rows.js'

async function get (name, id, opts = {}) {
  const { runHook, isSet } = this.app.bajo
  const { get, set } = this.cache ?? {}
  const { cloneDeep } = this.app.bajo.lib._
  const options = cloneDeep(opts)
  options.dataOnly = options.dataOnly ?? true
  const { fields, dataOnly, noHook, noCache, hidden = [] } = options
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-get')
  id = this.sanitizeId(id, schema)
  options.dataOnly = false
  if (!noHook) {
    await runHook(`${this.name}:onBeforeRecordGet`, name, id, options)
    await runHook(`${this.name}.${name}:onBeforeRecordGet`, id, options)
  }
  if (get && !noCache) {
    const cachedResult = await get({ model: name, id, options })
    if (cachedResult) {
      cachedResult.cached = true
      return dataOnly ? cachedResult.data : cachedResult
    }
  }
  const record = await handler.call(this.app[driver.ns], { schema, id, options })
  if (!noHook) {
    await runHook(`${this.name}.${name}:onAfterRecordGet`, id, options, record)
    await runHook(`${this.name}:onAfterRecordGet`, name, id, options, record)
  }
  record.data = await this.pickRecord({ record: record.data, fields, schema, hidden })
  if (isSet(options.rels)) await singleRelRows.call(this, { schema, record: record.data, options })

  if (set && !noCache) await set({ model: name, id, options, record })
  return dataOnly ? record.data : record
}

export default get
