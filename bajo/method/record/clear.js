import resolveMethod from '../../../lib/resolve-method.js'

async function clear (name, opts = {}) {
  const { runHook } = this.app.bajo
  await this.modelExists(name, true)
  const { cloneDeep } = this.app.bajo.lib._
  const options = cloneDeep(opts)
  const { noHook } = options
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-clear')
  if (!noHook) {
    await runHook(`${this.name}:onBeforeRecordClear`, name, options)
    await runHook(`${this.name}.${name}:onBeforeRecordClear`, options)
  }
  const resp = await handler.call(this.app[driver.ns], { schema, options })
  if (!noHook) {
    await runHook(`${this.name}.${name}:onAfterRecordClear`, options, resp)
    await runHook(`${this.name}:onAfterRecordClear`, name, options, resp)
  }
  return resp
}

export default clear
