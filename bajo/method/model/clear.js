import resolveMethod from '../../../lib/resolve-method.js'

async function clear (name, options = {}) {
  const { runHook } = this.app.bajo
  await this.modelExists(name, true)
  const { noHook } = options
  const { handler, schema } = await resolveMethod.call(this, name, 'model-clear')
  if (!noHook) {
    await runHook(`${this.name}:onBeforeCollClear`, name, options)
    await runHook(`${this.name}.${name}:onBeforeCollClear`, options)
  }
  const resp = await handler.call(this, { schema, options })
  if (!noHook) {
    await runHook(`${this.name}.${name}:onAfterCollClear`, options, resp)
    await runHook(`${this.name}:onAfterCollClear`, name, options, resp)
  }
  return resp
}

export default clear
