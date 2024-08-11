async function connSanitizer (connection) {
  const { pick } = this.app.bajo.lib._
  const result = pick(connection, ['type', 'name', 'driver'])
  result.memory = true
  return result
}

export default connSanitizer
