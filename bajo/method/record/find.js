import resolveMethod from '../../../lib/resolve-method.js'
import multiRelRows from '../../../lib/multi-rel-rows.js'

async function find (name, filter = {}, opts = {}) {
  const { runHook, isSet } = this.app.bajo
  const { get, set } = this.cache ?? {}
  const { cloneDeep, camelCase, omit } = this.app.bajo.lib._
  const options = cloneDeep(omit(opts, ['req']))
  options.req = opts.req
  options.dataOnly = options.dataOnly ?? true
  let { fields, dataOnly, noHook, noCache, hidden, forceNoHidden } = options
  options.count = options.count ?? false
  options.dataOnly = false
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-find', options)
  if (!schema.cacheable) noCache = true
  filter.query = await this.buildQuery({ filter, schema, options }) ?? {}
  if (options.queryHandler) filter.query = await options.queryHandler.call(opts.req ? this.app[opts.req.ns] : this, filter.query, opts.req)
  filter.match = this.buildMatch({ input: filter.match, schema, options }) ?? {}
  if (!noHook) {
    await runHook(`${this.name}:beforeRecordFind`, name, filter, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeRecordFind`, filter, options)
  }
  if (get && !noCache) {
    const cachedResult = await get({ model: name, filter, options })
    if (cachedResult) {
      cachedResult.cached = true
      return dataOnly ? cachedResult.data : cachedResult
    }
  }
  const records = await handler.call(this.app[driver.ns], { schema, filter, options })
  if (!noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterRecordFind`, filter, options, records)
    await runHook(`${this.name}:afterRecordFind`, name, filter, options, records)
  }
  for (const idx in records.data) {
    records.data[idx] = await this.pickRecord({ record: records.data[idx], fields, schema, hidden, forceNoHidden })
  }
  if (isSet(options.rels)) await multiRelRows.call(this, { schema, records: records.data, options })
  if (set && !noCache) await set({ model: name, filter, options, records })
  return dataOnly ? records.data : records
}

export default find
