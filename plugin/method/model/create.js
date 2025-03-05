import resolveMethod from '../../../lib/resolve-method.js'

async function create (name, options = {}) {
  const { runHook } = this.app.bajo
  const { camelCase } = this.app.bajo.lib._

  const { handler, schema } = await resolveMethod.call(this, name, 'model-create', options)
  if (!options.noHook) {
    await runHook(`${this.name}:beforeModelCreate`, schema, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeModelCreate`, options)
  }
  await handler.call(this, { schema, options })
  if (!options.noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterModelCreate`, options)
    await runHook(`${this.name}:afterModelCreate`, schema, options)
  }
}

export default create
