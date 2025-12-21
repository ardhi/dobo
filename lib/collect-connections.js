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

  async function handler ({ item }) {
    const { has } = this.app.lib._
    const Connection = await connectionFactory.call(this)
    if (!has(item, 'driver')) this.fatal('unknownDbDriver%s')
    let driver
    try {
      driver = this.getDriver(item.driver)
      if (!driver) throw new Error()
    } catch (err) {
      this.fatal('unknownDbDriver%s', item.driver)
    }
    await driver.sanitizeConnectionInfo(item)
    item.driver = driver
    return new Connection(this, item)
  }
  const memIndexes = filterIndex(this.config.connections, current => current.driver === 'dobo:memory')
  pullAt(this.config.connections, memIndexes)
  this.config.connections.unshift({
    driver: 'dobo:memory',
    name: 'memory'
  })
  this.connections = await buildCollections({ ns: this.ns, container: 'connections', handler, dupChecks: ['name'] })
  if (this.connections.length === 0) this.log.warn('notFound%s', this.t('connection'))
}

export default collectConnections
