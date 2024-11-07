import collectConnections from '../lib/collect-connections.js'
import collectDrivers from '../lib/collect-drivers.js'
import collectFeature from '../lib/collect-feature.js'
import collectSchemas from '../lib/collect-schemas.js'

async function checkType (item, items) {
  const { filter } = this.app.bajo.lib._
  const existing = filter(items, { type: 'dobo:memory' })
  if (existing.length > 1) this.fatal('There could only be one connection type \'%s\'', item.type)
}

async function init () {
  const { buildCollections } = this.app.bajo
  const { fs } = this.app.bajo.lib
  fs.ensureDirSync(`${this.dir.data}/attachment`)
  await collectDrivers.call(this)
  if (this.config.memDb.createDefConnAtStart) {
    this.config.connections.push({
      type: 'dobo:memory',
      name: 'memory'
    })
  }
  this.connections = await buildCollections({ ns: this.name, container: 'connections', handler: collectConnections, dupChecks: ['name', checkType] })
  if (this.connections.length === 0) this.log.warn('No %s found!', this.print.write('connection'))
  await collectFeature.call(this)
  await collectSchemas.call(this)
}

export default init
