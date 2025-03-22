import resolveMethod from '../../../lib/resolve-method.js'
import multiRelRows from '../../../lib/multi-rel-rows.js'
import execFeatureHook from '../../../lib/exec-feature-hook.js'

async function find (name, filter = {}, opts = {}) {
  const { runHook, isSet } = this.app.bajo
  const { get, set } = this.cache ?? {}
  const { cloneDeep, camelCase, omit } = this.lib._
  delete opts.records
  const options = cloneDeep(omit(opts, ['req', 'reply']))
  options.req = opts.req
  options.reply = opts.reply
  options.dataOnly = options.dataOnly ?? true
  let { fields, dataOnly, noHook, noCache, noFeatureHook, hidden, forceNoHidden } = options
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
  if (!noFeatureHook) await execFeatureHook.call(this, 'beforeFind', { schema, filter, options })
  if (get && !noCache && !options.records) {
    const cachedResult = await get({ model: name, filter, options })
    if (cachedResult) {
      cachedResult.cached = true
      if (!noFeatureHook) await execFeatureHook.call(this, 'afterFind', { schema, filter, options, records: cachedResult })
      return dataOnly ? cachedResult.data : cachedResult
    }
  }
  const records = options.records ?? (await handler.call(this.app[driver.ns], { schema, filter, options }))
  delete options.records
  if (isSet(options.rels)) await multiRelRows.call(this, { schema, records: records.data, options })
  if (!noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterRecordFind`, filter, options, records)
    await runHook(`${this.name}:afterRecordFind`, name, filter, options, records)
  }
  for (const idx in records.data) {
    records.data[idx] = await this.pickRecord({ record: records.data[idx], fields, schema, hidden, forceNoHidden })
  }
  if (set && !noCache) await set({ model: name, filter, options, records })
  if (!noFeatureHook) await execFeatureHook.call(this, 'afterFind', { schema, filter, options, records })
  return dataOnly ? records.data : records
}

export default find
