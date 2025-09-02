async function execValidation ({ name, body, options, partial }) {
  const { runHook } = this.app.bajo
  const { keys, camelCase } = this.app.lib._
  const { noHook } = options
  if (!noHook) {
    await runHook(`${this.ns}:beforeRecordValidation`, name, body, options)
    await runHook(`${this.ns}.${camelCase(name)}:beforeRecordValidation`, body, options)
  }
  const { validation = {} } = options
  if (partial) {
    validation.fields = keys(body)
  }
  body = await this.validate(body, name, validation)
  if (!noHook) {
    await runHook(`${this.ns}:afterRecordValidation`, name, body, options)
    await runHook(`${this.ns}.${camelCase(name)}:afterRecordValidation`, body, options)
  }
  return body
}

export default execValidation
