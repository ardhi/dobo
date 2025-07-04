import resolveMethod from '../../lib/resolve-method.js'

const types = ['daily', 'monthly', 'yearly']

async function histogram (name, filter = {}, options = {}) {
  const { runHook, join } = this.app.bajo
  const { dataOnly = true, noHook, type } = options
  options.dataOnly = false
  if (!types.includes(type)) throw this.error('histogramTypeMusBe%s', join(types))
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'stat-histogram', options)
  filter.query = await this.buildQuery({ filter, schema, options }) ?? {}
  filter.match = this.buildMatch({ input: filter.match, schema, options }) ?? {}
  if (!noHook) {
    await runHook(`${this.name}:beforeStatHistogram`, name, type, filter, options)
    await runHook(`${this.name}.${name}:beforeStatHistogram`, type, filter, options)
  }
  const rec = await handler.call(this.app[driver.ns], { schema, type, filter, options })
  if (!noHook) {
    await runHook(`${this.name}.${name}:afterStatHistogram`, type, filter, options, rec)
    await runHook(`${this.name}:afterStatHistogram`, name, type, filter, options, rec)
  }
  return dataOnly ? rec.data : rec
}

export default histogram
