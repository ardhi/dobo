import resolveMethod from '../../lib/resolve-method.js'

async function create (name, options = {}) {
  const { runHook } = this.app.bajo
  const { camelCase } = this.lib._

  const { handler, schema, driver } = await resolveMethod.call(this, name, 'model-create', options)
  if (!options.noHook) {
    await runHook(`${this.name}:beforeModelCreate`, schema, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeModelCreate`, options)
  }
  await handler.call(this.app[driver.ns], { schema, options })
  if (!options.noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterModelCreate`, options)
    await runHook(`${this.name}:afterModelCreate`, schema, options)
  }
}

export default create
