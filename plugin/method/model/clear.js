import resolveMethod from '../../../lib/resolve-method.js'

async function clear (name, options = {}) {
  const { runHook } = this.app.bajo
  const { camelCase } = this.app.bajo.lib._

  await this.modelExists(name, true)
  const { noHook } = options
  const { handler, schema } = await resolveMethod.call(this, name, 'model-clear', options)
  if (!noHook) {
    await runHook(`${this.name}:beforeModelClear`, schema, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeModelClear`, options)
  }
  const resp = await handler.call(this, { schema, options })
  if (!noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterModelClear`, options, resp)
    await runHook(`${this.name}:afterModelClear`, schema, options, resp)
  }
  return resp
}

export default clear
