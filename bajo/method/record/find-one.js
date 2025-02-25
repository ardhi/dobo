import resolveMethod from '../../../lib/resolve-method.js'
import singleRelRows from '../../../lib/single-rel-rows.js'

async function findOne (name, filter = {}, opts = {}) {
  const { runHook, isSet } = this.app.bajo
  const { get, set } = this.cache ?? {}
  const { cloneDeep, camelCase, omit } = this.app.bajo.lib._
  const options = cloneDeep(omit(opts, ['req', 'reply']))
  options.req = opts.req
  options.reply = opts.reply
  options.dataOnly = options.dataOnly ?? true
  let { fields, dataOnly, noHook, noCache, hidden, forceNoHidden } = options
  options.count = false
  options.dataOnly = false
  await this.modelExists(name, true)
  filter.limit = 1
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-find', options)
  if (!schema.cacheable) noCache = true
  filter.query = await this.buildQuery({ filter, schema, options }) ?? {}
  if (options.queryHandler) filter.query = await options.queryHandler.call(opts.req ? this.app[opts.req.ns] : this, filter.query, opts.req)
  filter.match = this.buildMatch({ input: filter.match, schema, options }) ?? {}
  if (!noHook) {
    await runHook(`${this.name}:beforeRecordFindOne`, name, filter, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeRecordFindOne`, filter, options)
  }
  if (get && !noCache) {
    const cachedResult = await get({ model: name, filter, options })
    if (cachedResult) {
      cachedResult.cached = true
      return dataOnly ? cachedResult.data : cachedResult
    }
  }
  const record = await handler.call(this.app[driver.ns], { schema, filter, options })
  record.data = record.data[0]
  if (!noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterRecordFindOne`, filter, options, record)
    await runHook(`${this.name}:afterRecordFindOne`, name, filter, options, record)
  }
  record.data = await this.pickRecord({ record: record.data, fields, schema, hidden, forceNoHidden })
  if (isSet(options.rels)) await singleRelRows.call(this, { schema, record: record.data, options })
  if (set && !noCache) await set({ model: name, filter, options, record })
  return dataOnly ? record.data : record
}

export default findOne
