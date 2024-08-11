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
  for (const schema of schemas) {
    this.memDb.storage[schema.name] = this.memDb.storage[schema.name] ?? [] // init empty model
  }
  if (this.config.memDb.persistence.models.length > 0) {
    const dir = `${getPluginDataDir(this.name)}/memDb/data`
    fs.ensureDirSync(dir)
    // load
    for (const key of this.config.memDb.persistence.models) {
      if (!this.memDb.storage[key]) this.fatal('Invalid model for persistence: %s', key)
      const file = `${dir}/${key}.json`
      if (!fs.existsSync(file)) continue
      try {
        const data = fs.readFileSync(file, 'utf8')
        this.memDb.storage[key] = JSON.parse(data)
      } catch (err) {
        this.fatal('Can\'t load %s: %s', key, err.message)
      }
    }
    // persist periodically
    setInterval(() => {
      for (const key of this.config.memDb.persistence.models) {
        const data = this.memDb.storage[key]
        fs.writeFileSync(`${dir}/${key}.json`, JSON.stringify(data), 'utf8')
      }
    }, this.config.memDb.persistence.period * 1000)
  }
}

export default instantiate
