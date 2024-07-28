import resolveMethod from '../../../lib/resolve-method.js'

const cache = {}

async function exists (name, thrown, options = {}) {
  if (cache[name]) return cache[name]
  const { runHook } = this.app.bajo
  const { handler, schema } = await resolveMethod.call(this, name, 'model-exists', options)
  await runHook(`${this.name}:beforeCollExists` + name, schema)
  const exist = await handler.call(this, { schema, options })
  await runHook(`${this.name}:afterCollExists` + name, schema, exist)
  if (!exist && thrown) throw this.error('Model doesn\'t exist yet. Please do model rebuild first')
  cache[name] = exist
  return exist
}

export default exists
