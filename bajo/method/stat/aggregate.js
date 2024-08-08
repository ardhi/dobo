import resolveMethod from '../../../lib/resolve-method.js'

async function aggregate (name, filter = {}, options = {}) {
  const { runHook } = this.app.bajo
  const { dataOnly = true, noHook, aggregate } = options
  options.dataOnly = false
  await this.modelExists(name, true)
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'stat-aggregate')
  if (!noHook) {
    await runHook(`${this.name}:beforeStatAggregate`, name, aggregate, filter, options)
    await runHook(`${this.name}.${name}:beforeStatAggregate`, aggregate, filter, options)
  }
  const rec = await handler.call(this.app[driver.ns], { schema, filter, options })
  filter.query = await this.buildQuery({ filter, schema, options }) ?? {}
  filter.match = this.buildMatch({ input: filter.match, schema, options }) ?? {}
  if (!noHook) {
    await runHook(`${this.name}.${name}:afterStatAggregate`, aggregate, filter, options, rec)
    await runHook(`${this.name}:afterStatAggregate`, name, aggregate, filter, options, rec)
  }
  return dataOnly ? rec.data : rec
}

export default aggregate
