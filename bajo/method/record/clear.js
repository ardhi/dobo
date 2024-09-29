import resolveMethod from '../../../lib/resolve-method.js'

async function clear (name, opts = {}) {
  const { runHook } = this.app.bajo
  await this.modelExists(name, true)
  const { cloneDeep, camelCase, omit } = this.app.bajo.lib._
  const options = cloneDeep(omit(opts, ['req']))
  options.req = opts.req
  const { noHook } = options
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-clear')
  if (!noHook) {
    await runHook(`${this.name}:beforeRecordClear`, name, options)
    await runHook(`${this.name}.${camelCase(name)}:beforeRecordClear`, options)
  }
  const resp = await handler.call(this.app[driver.ns], { schema, options })
  if (!noHook) {
    await runHook(`${this.name}.${camelCase(name)}:afterRecordClear`, options, resp)
    await runHook(`${this.name}:afterRecordClear`, name, options, resp)
  }
  return resp
}

export default clear
