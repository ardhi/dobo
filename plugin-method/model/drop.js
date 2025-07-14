import resolveMethod from '../../lib/resolve-method.js'

async function drop (name, options = {}) {
  const { runHook } = this.app.bajo
  const { camelCase } = this.lib._
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'model-drop', options)

  if (!options.noHook) {
    await runHook(`${this.name}:beforeModelDrop`, schema, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeModelDrop`, options)
  }
  await handler.call(this.app[driver.ns], { schema, options })
  if (!options.noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterModelDrop`, options)
    await runHook(`${this.name}:afterModelDrop`, schema, options)
  }
}

export default drop
