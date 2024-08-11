let saving = false

async function instantiate ({ connection, schemas, noRebuild }) {
  const { getPluginDataDir } = this.app.bajo
  const { fs } = this.app.bajo.lib
  const { pick } = this.app.bajo.lib._
  this.memDb = this.memDb ?? {}
  this.memDb.storage = this.memDb.storage ?? {}
  this.memDb.instances = this.memDb.instances ?? []
  const instance = pick(connection, ['name', 'type'])
  this.memDb.instances.push(instance)
  // if (noRebuild) return
  const pdir = `${getPluginDataDir(this.name)}/memDb/data` // persistence dir
  fs.ensureDirSync(pdir)
  const persistence = []
  for (const schema of schemas) {
    this.memDb.storage[schema.name] = this.memDb.storage[schema.name] ?? [] // init empty model
    if (!schema.persistence) continue
    persistence.push(schema.name)
    // load if persistence
    const file = `${pdir}/${schema.name}.json`
    if (!fs.existsSync(file)) continue
    try {
      const data = fs.readFileSync(file, 'utf8')
      this.memDb.storage[schema.name] = JSON.parse(data)
    } catch (err) {
      this.fatal('Can\'t load %s: %s', schema.name, err.message)
    }
  }
  setInterval(() => {
    if (saving) return
    saving = true
    for (const item of persistence) {
      const data = this.memDb.storage[item]
      fs.writeFileSync(`${pdir}/${item}.json`, JSON.stringify(data), 'utf8')
    }
    saving = false
  }, this.config.memDb.persistence.syncPeriod * 1000)
}

export default instantiate
