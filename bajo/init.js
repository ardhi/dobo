import collectConnections from '../lib/collect-connections.js'
import collectDrivers from '../lib/collect-drivers.js'
import collectFeature from '../lib/collect-feature.js'
import collectSchemas from '../lib/collect-schemas.js'

async function init () {
  const { buildCollections } = this.app.bajo
  const { fs } = this.app.bajo.lib
  const cfg = this.config
  fs.ensureDirSync(`${cfg.dir.data}/attachment`)
  await collectDrivers.call(this)
  this.connections = await buildCollections({ ns: this.name, handler: collectConnections, dupChecks: ['name'] })
  if (this.connections.length === 0) this.log.warn('No %s found!', this.print.write('connection'))
  await collectFeature.call(this)
  await collectSchemas.call(this)
}

export default init
