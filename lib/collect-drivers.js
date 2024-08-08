async function collectDrivers () {
  const { eachPlugins, readConfig, runHook } = this.app.bajo
  const { isString, find, pick, merge } = this.app.bajo.lib._
  const me = this
  me.drivers = []
  await runHook(`${this.name}:beforeModelectDrivers`)
  await eachPlugins(async function ({ file, ns }) {
    const info = await readConfig(file, { ns })
    if (!info.type) this.fatal('A DB driver must provide at least one database type')
    if (!info.driver) this.fatal('A DB driver must have a driver name')
    if (isString(info.type)) info.type = [info.type]
    if (!info.idField) info.idField = me.config.defaults.idField
    info.idField.name = 'id'
    for (const t of info.type) {
      const [type, provider] = t.split('@')
      const exists = find(me.drivers, { type, ns })
      if (exists) this.fatal('Database type \'%s\' already supported by driver \'%s\'', type, info.driver)
      const driver = pick(find(me.app[ns].drivers, { name: type }) ?? {}, ['dialect', 'idField', 'lowerCaseColl', 'returning'])
      const ext = {
        type,
        ns,
        provider,
        driver: info.driver,
        idField: info.idField
      }
      me.drivers.push(merge(ext, driver))
    }
  }, { glob: 'boot/driver.*', baseNs: this.name })
  await runHook(`${this.name}:afterModelectDrivers`)
}

export default collectDrivers
