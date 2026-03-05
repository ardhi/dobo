async function transaction (handler, ...args) {
  if (!this.driver.support.transaction) return handler.call(this, ...args)
  return await this.driver.transaction(this, handler, ...args)
}

export default transaction
