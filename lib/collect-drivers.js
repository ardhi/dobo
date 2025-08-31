/**
 * Collect all database drivers from loaded plugins
 *
 * @name collectDrivers
 * @memberof module:Lib
 * @async
 * @see Dobo#init
 */
async function collectDrivers () {
  const { eachPlugins, readConfig, runHook } = this.app.bajo
  const { isString, find, pick, merge, cloneDeep } = this.app.lib._
  const me = this
  me.drivers = []
  // built-in memory driver
  me.drivers.push({
    type: 'memory',
    ns: me.name,
    driver: 'memory',
    idField: merge(cloneDeep(me.config.default.idField), { name: 'id' })
  })
  // others
  await runHook(`${this.name}:beforeCollectDrivers`)
  await eachPlugins(async function ({ file }) {
    const { name: ns } = this
    const info = await readConfig(file, { ns })
    if (!info.type) this.fatal('driverMustProvideDbType')
    if (!info.driver) this.fatal('driverMustHaveName')
    if (isString(info.type)) info.type = [info.type]
    if (!info.idField) info.idField = cloneDeep(me.config.default.idField)
    info.idField.name = 'id'
    for (const t of info.type) {
      const [type, provider] = t.split('@')
      const exists = find(me.drivers, { type, ns })
      if (exists) this.fatal('dbTypeAlreadySupportedByDriver%s%s', type, info.driver)
      const driver = pick(find(me.app[ns].drivers, { name: type }) ?? {}, ['dialect', 'idField', 'lowerCaseModel', 'returning'])
      const ext = {
        type,
        ns,
        provider,
        driver: info.driver,
        idField: info.idField
      }
      me.drivers.push(merge(ext, driver))
    }
  }, { glob: 'boot/driver.*', prefix: this.name })
  await runHook(`${this.name}:afterCollectDrivers`)
}

export default collectDrivers
