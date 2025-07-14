import resolveMethod from '../../lib/resolve-method.js'

const cache = {}

async function exists (name, thrown, options = {}) {
  if (cache[name]) return cache[name]
  const { runHook } = this.app.bajo
  const { camelCase } = this.lib._
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'model-exists', options)
  if (!options.noHook) {
    await runHook(`${this.name}:beforeModelExists`, schema, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeModelExists`, options)
  }
  const exist = await handler.call(this.app[driver.ns], { schema, options })
  if (!options.noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterModelExists`, exist, options)
    await runHook(`${this.name}:afterModelExists`, schema, exist, options)
  }
  if (!exist && thrown) throw this.error('modelNotExists%s', name)
  cache[name] = exist
  return exist
}

export default exists
