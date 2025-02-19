import memDbStart from '../lib/mem-db/start.js'
import memDbInstantiate from '../lib/mem-db/instantiate.js'

async function start (conns = 'all', noRebuild = true) {
  const { importModule, breakNsPath } = this.app.bajo
  const { find, filter, isString, map } = this.app.bajo.lib._
  if (conns === 'all') conns = this.connections
  else if (isString(conns)) conns = filter(this.connections, { name: conns })
  else conns = map(conns, c => find(this.connections, { name: c }))
  for (const c of conns) {
    const { ns } = breakNsPath(c.type)
    const schemas = filter(this.schemas, { connection: c.name })
    const mod = c.type === 'dobo:memory' ? memDbInstantiate : await importModule(`${ns}:/${this.name}/boot/instantiate.js`)
    await mod.call(this.app[ns], { connection: c, noRebuild, schemas })
    this.log.trace('driverInstantiated%s%s', c.driver, c.name)
  }
  await memDbStart.call(this)
}

export default start
