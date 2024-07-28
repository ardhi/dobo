import resolveMethod from '../../../lib/resolve-method.js'

async function create (name, options = {}) {
  const { runHook } = this.app.bajo
  const { handler, schema } = await resolveMethod.call(this, name, 'model-create', options)
  await runHook(`${this.name}:beforeCollCreate` + name, schema)
  await handler.call(this, { schema, options })
  await runHook(`${this.name}:afterCollCreate` + name, schema)
}

export default create
