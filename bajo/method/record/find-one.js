import resolveMethod from '../../../lib/resolve-method.js'
import singleRelRows from '../../../lib/single-rel-rows.js'

async function findOne (name, filter = {}, opts = {}) {
  const { runHook, isSet } = this.app.bajo
  const { get, set } = this.cache ?? {}
  const { cloneDeep } = this.app.bajo.lib._
  const options = cloneDeep(opts)
  options.dataOnly = options.dataOnly ?? true
  const { fields, dataOnly, noHook, noCache, hidden } = options
  await this.modelExists(name, true)
  filter.limit = 1
  options.count = false
  options.dataOnly = false
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-find')
  if (!noHook) {
    await runHook(`${this.name}:onBeforeRecordFindOne`, name, filter, options)
    await runHook(`${this.name}.${name}:onBeforeRecordFindOne`, filter, options)
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
    await runHook(`${this.name}.${name}:onAfterRecordFindOne`, filter, options, record)
    await runHook(`${this.name}:onAfterRecordFindOne`, name, filter, options, record)
  }
  record.data = await this.pickRecord({ record: record.data, fields, schema, hidden })
  if (isSet(options.rels)) await singleRelRows.call(this, { schema, record: record.data, options })
  if (set && !noCache) await set({ model: name, filter, options, record })
  return dataOnly ? record.data : record
}

export default findOne
