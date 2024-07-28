function getInfo (name) {
  const { breakNsPath } = this.app.bajo
  const { find, map } = this.app.bajo.lib._
  const schema = this.getSchema(name)
  const conn = find(this.connections, { name: schema.connection })
  const [ns, type] = breakNsPath(conn.type)
  const driver = find(this.drivers, { type, ns, driver: conn.driver })
  const instance = find(this.app[driver.ns].instances, { name: schema.connection })
  const opts = conn.type === 'mssql' ? { includeTriggerModifications: true } : undefined
  const returning = [map(schema.properties, 'name'), opts]
  return { instance, driver, connection: conn, returning, schema }
}

export default getInfo
