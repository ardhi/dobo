import addFixtures from '../add-fixtures.js'

async function start () {
  const { filter, map } = this.lib._

  const conns = filter(this.connections, { type: 'dobo:memory' })
  const schemas = filter(this.schemas, s => {
    const names = map(conns, 'name')
    return names.includes(s.connection)
  })
  if (schemas.length === 0) return
  this.log.debug('addingFixtureToMemDb')
  for (const schema of schemas) {
    if (schema.persistence) {
      this.log.warn('addingMemoryPersistenceIgnored', schema.name)
      continue
    }
    let { success, error } = await addFixtures.call(this, schema.name)
    success = success ?? 0
    error = error ?? 0
    this.log.trace('- %s@%s (%d/%d)', schema.name, schema.connection, success, success + error)
  }
}

export default start
