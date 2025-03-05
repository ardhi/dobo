import resolveMethod from '../../../lib/resolve-method.js'

async function count (name, filter = {}, opts = {}) {
  const { runHook } = this.app.bajo
  const { get, set } = this.cache ?? {}
  const { cloneDeep, camelCase, omit } = this.app.bajo.lib._
  const options = cloneDeep(omit(opts, ['req', 'reply']))
  options.req = opts.req
  options.reply = opts.reply
  options.dataOnly = options.dataOnly ?? true
  let { dataOnly, noHook, noCache } = options
  options.dataOnly = false
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-count', options)
  if (!schema.cacheable) noCache = true
  filter.query = await this.buildQuery({ filter, schema, options }) ?? {}
  if (options.queryHandler) filter.query = await options.queryHandler.call(opts.req ? this.app[opts.req.ns] : this, filter.query, opts.req)
  filter.match = this.buildMatch({ input: filter.match, schema, options }) ?? {}
  if (!noHook) {
    await runHook(`${this.name}:beforeRecordCount`, name, filter, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeRecordCount`, filter, options)
  }
  if (get && !noCache) {
    const cachedResult = await get({ model: name, filter, options })
    if (cachedResult) {
      cachedResult.cached = true
      return dataOnly ? cachedResult.data : cachedResult
    }
  }
  const count = await handler.call(this.app[driver.ns], { schema, filter, options })
  if (!noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterRecordCount`, filter, options, count)
    await runHook(`${this.name}:afterRecordCount`, name, filter, options, count)
  }
  if (set && !noCache) await set({ model: name, filter, options, count })
  return dataOnly ? count.data : count
}

export default count
