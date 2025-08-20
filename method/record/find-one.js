import resolveMethod from '../../lib/resolve-method.js'
import singleRelRows from '../../lib/single-rel-rows.js'
import execFeatureHook from '../../lib/exec-feature-hook.js'

async function findOne (name, filter = {}, opts = {}) {
  const { isSet } = this.lib.aneka
  const { runHook } = this.app.bajo
  const { get, set } = this.cache ?? {}
  const { cloneDeep, camelCase, omit, pick } = this.lib._
  delete opts.record
  const options = cloneDeep(omit(opts, ['req', 'reply']))
  options.req = opts.req
  options.reply = opts.reply
  options.dataOnly = options.dataOnly ?? true
  let { fields, dataOnly, noHook, noCache, noFeatureHook, hidden, forceNoHidden } = options
  options.count = false
  options.dataOnly = false
  await this.modelExists(name, true)
  filter.limit = 1
  filter.page = 1
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-find', options)
  if (!schema.cacheable) noCache = true
  filter.query = this.buildQuery({ filter, schema, options }) ?? {}
  if (options.queryHandler) filter.query = await options.queryHandler.call(opts.req ? this.app[opts.req.ns] : this, filter.query, opts.req)
  filter.match = this.buildMatch({ input: filter.match, schema, options }) ?? {}
  if (!noHook) {
    await runHook(`${this.name}:beforeRecordFindOne`, name, filter, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeRecordFindOne`, filter, options)
  }
  if (!noFeatureHook) await execFeatureHook.call(this, 'beforeFindOne', { schema, filter, options })
  if (get && !noCache && !options.record) {
    const cachedResult = await get({ model: name, filter, options })
    if (cachedResult) {
      cachedResult.cached = true
      return dataOnly ? cachedResult.data : cachedResult
    }
  }
  filter.limit = 1
  filter.page = 1
  let record = options.record ?? (await handler.call(this.app[driver.ns], { schema, filter, options }))
  delete options.record
  record.data = record.data[0]

  if (isSet(options.rels)) await singleRelRows.call(this, { schema, record: record.data, options })
  record.data = await this.pickRecord({ record: record.data, fields, schema, hidden, forceNoHidden })
  record = pick(record, ['data'])
  if (!noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterRecordFindOne`, filter, options, record)
    await runHook(`${this.name}:afterRecordFindOne`, name, filter, options, record)
  }
  if (set && !noCache) await set({ model: name, filter, options, record })
  if (!noFeatureHook) await execFeatureHook.call(this, 'afterFindOne', { schema, filter, options, record })
  return dataOnly ? record.data : record
}

export default findOne
