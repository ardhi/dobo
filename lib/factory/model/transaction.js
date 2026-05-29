async function transaction (handler, ...args) {
  if (!this.driver.support.transaction) return handler.call(this)

  const { ns } = this.app.dobo
  const { camelCase } = this.app.lib._
  const { runHook } = this.app.bajo
  const name = 'afterTransaction'
  const result = await this.driver.transaction(this, handler, ...args)
  const [action, ...params] = args
  await runHook(`${ns}:${name}`, this.name, action, result, ...params)
  await runHook(`${ns}.${camelCase(this.name)}:${name}`, action, result, ...params)
  return result
}

export default transaction
