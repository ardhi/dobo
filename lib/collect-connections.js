async function defSanitizer (item) {
  // if (!item.connection) fatal('\'%s@%s\' key is required', 'connection', item.name, { payload: item })
  const { merge } = this.app.bajo.lib._
  return merge({}, item)
}

async function collectConnections ({ item, index, options }) {
  const conn = item
  const { importModule, breakNsPath } = this.app.bajo
  const { has, find } = this.app.bajo.lib._
  if (!has(conn, 'type')) this.fatal('Connection must have a valid DB type')
  const [ns, type] = breakNsPath(conn.type)
  const driver = find(this.drivers, { ns, type })
  if (!driver) this.fatal('Unsupported DB type \'%s\'', conn.type)
  let file = `${ns}:/${this.name}/lib/${type}/conn-sanitizer.js`
  if (driver.provider) file = `${driver.provider}:/${ns}/lib/${type}/conn-sanitizer.js`
  let sanitizer = await importModule(file)
  if (!sanitizer) sanitizer = defSanitizer
  const result = await sanitizer.call(this, conn)
  result.proxy = result.proxy ?? false
  result.driver = driver.driver
  return result
}

export default collectConnections