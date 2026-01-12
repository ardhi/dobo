import connectionFactory from './factory/connection.js'

/**
 * Object to be passed as connection info in dobo config object
 *
 * @typedef TConnectionInfo
 * @memberof module:Lib
 * @property {string} name - Must be unique along all connections. Required
 * @property {string} driver - Driver to use. If not in ```TNsPath``` format, it will be autodetected. Required
 * @property {string} [host]
 * @property {number} [port]
 * @property {string} [username]
 * @property {string} [password]
 * @property {string} database - Database name. Required
 * @property {string[]} [models] - List of models forced to use this connection
 * @property {Object} [options] - Options specific to the driver
 */

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
async function collectConnections () {
  const { buildCollections } = this.app.bajo
  const { pullAt } = this.app.lib._
  const { filterIndex } = this.app.lib.aneka
  const DoboConnection = await connectionFactory.call(this)

  async function handler ({ item }) {
    const { has } = this.app.lib._
    if (!has(item, 'driver')) this.fatal('unknownDbDriver%s')
    let driver
    try {
      driver = this.getDriver(item.driver, true)
      if (!driver) throw new Error()
    } catch (err) {
      this.fatal('unknownDbDriver%s', item.driver)
    }
    await driver.sanitizeConnection(item)
    const conn = new DoboConnection(this, item)
    conn.driver = driver
    return conn
  }
  const memIndexes = filterIndex(this.config.connections, current => current.driver === 'dobo:memory' || current.name === 'memory')
  const models = memIndexes.map(idx => [...(this.config.connections[idx].models ?? [])])
  pullAt(this.config.connections, memIndexes)
  this.config.connections.unshift({
    driver: 'dobo:memory',
    name: 'memory',
    models
  })
  this.connections = await buildCollections({ ns: this.ns, container: 'connections', handler, dupChecks: ['name'] })
  const defConn = this.connections.find(conn => conn.name === 'default')
  if (!defConn) this.log.warn('noDefaultConnection')
}

export default collectConnections
