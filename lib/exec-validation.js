async function execValidation ({ noHook, name, body, options, partial }) {
  const { runHook } = this.app.bajo
  const { get, keys } = this.app.bajo.lib._
  if (!noHook) {
    await runHook(`${this.name}:onBeforeRecordValidation`, name, body, options)
    await runHook(`${this.name}.${name}:onBeforeRecordValidation`, body, options)
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
    await runHook(`${this.name}:onAfterRecordValidation`, name, body, options)
    await runHook(`${this.name}.${name}:onAfterRecordValidation`, body, options)
  }
  return body
}

export default execValidation
