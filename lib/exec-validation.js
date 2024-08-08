async function execValidation ({ noHook, name, body, options, partial }) {
  const { runHook } = this.app.bajo
  const { get, keys } = this.app.bajo.lib._
  if (!noHook) {
    await runHook(`${this.name}:beforeRecordValidation`, name, body, options)
    await runHook(`${this.name}.${name}:beforeRecordValidation`, body, options)
  }
  const { validation = {} } = options
  if (partial) {
    validation.fields = keys(body)
  }
  try {
    body = await this.validate(body, name, validation)
  } catch (err) {
    if (err.code === 'DB_VALIDATION' && get(options, 'req.flash')) {
      options.req.flash('validation', err)
    }
    throw err
  }
  if (!noHook) {
    await runHook(`${this.name}:afterRecordValidation`, name, body, options)
    await runHook(`${this.name}.${name}:afterRecordValidation`, body, options)
  }
  return body
}

export default execValidation
