async function memory () {
  const { Driver } = this.app.dobo.lib

  class MemoryDriver extends Driver {
    constructor (plugin, options) {
      super(plugin)
      this.memory = true
      this.saving = true
      this.autoSave = []
      this.storage = {}
    }

    init = async ({ connection, schemas, noRebuild }) => {
      const { getPluginDataDir } = this.app.bajo
      const { fs } = this.app.lib
      const pdir = `${getPluginDataDir(this.plugin.ns)}/memDb/data` // persistence dir
      fs.ensureDirSync(pdir)
      connection.autoSave = connection.autoSave ?? []
      for (const schema of schemas) {
        this.storage[schema.name] = this.storage[schema.name] ?? [] // init empty model
        if (!connection.autoSave.includes(schema.name)) continue
        this.autoSave.push(schema.name)
        const file = `${pdir}/${schema.name}.json`
        if (!fs.existsSync(file)) continue
        try {
          const data = fs.readFileSync(file, 'utf8')
          this.storage[schema.name] = JSON.parse(data)
        } catch (err) {
          this.fatal('cantLoad%s%s', schema.name, err.message)
        }
      }
      // TODO: add fixture
      if (this.autoSave.length === 0) return
      setInterval(() => {
        if (!this.saving) return
        this.saving = true
        for (const item of this.autoSave) {
          const data = this.storage[item]
          fs.writeFileSync(`${pdir}/${item}.json`, JSON.stringify(data), 'utf8')
        }
        this.saving = false
      }, this.config.memDb.autoSaveDur)
    }
  }

  return MemoryDriver
}

export default memory
