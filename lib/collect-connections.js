async function defSanitizer (item) {
  return item
}

/**
 * Collect all database connections from {@tutorial config}.
 *
 * @name collectConnections
 * @memberof module:Lib
 * @async
 * @see Dobo#init
 * @param {Object} [options={}]
 * @param {Object} [options.item={}]
 * @returns {Object}
 */
async function collectConnections ({ item }) {
  const conn = item
  const { importModule, breakNsPath } = this.app.bajo
  const { has, find, isEmpty } = this.app.lib._
  if (!has(conn, 'type')) this.fatal('mustValidDbType')
  let { ns, path: type } = breakNsPath(conn.type)
  if (isEmpty(type)) type = conn.type
  const driver = find(this.drivers, { ns, type })
  if (!driver) this.fatal('unsupportedDbType%s', conn.type)
  let file = `${ns}:/extend/${this.name}/lib/${type}/conn-sanitizer.js`
  if (conn.type === 'dobo:memory') file = `${ns}:/lib/mem-db/conn-sanitizer.js`
  if (driver.provider) file = `${driver.provider}:/extend/${ns}/lib/${type}/conn-sanitizer.js`
  let sanitizer = await importModule(file)
  if (!sanitizer) sanitizer = defSanitizer
  const result = await sanitizer.call(this, conn)
  result.proxy = result.proxy ?? false
  result.driver = driver.driver
  return result
}

export default collectConnections
