import resolveMethod from '../../lib/resolve-method.js'

async function clear (name, opts = {}) {
  const { runHook } = this.app.bajo
  await this.modelExists(name, true)
  const { cloneDeep, camelCase, omit } = this.app.lib._
  const options = cloneDeep(omit(opts, ['req', 'reply']))
  options.req = opts.req
  options.reply = opts.reply
  const { noHook } = options
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'record-clear', options)
  if (!noHook) {
    await runHook(`${this.ns}:beforeRecordClear`, name, options)
    await runHook(`${this.ns}.${camelCase(name)}:beforeRecordClear`, options)
  }
  const resp = await handler.call(this.app[driver.ns], { schema, options })
  if (!noHook) {
    await runHook(`${this.ns}.${camelCase(name)}:afterRecordClear`, options, resp)
    await runHook(`${this.ns}:afterRecordClear`, name, options, resp)
  }
  return resp
}

export default clear
