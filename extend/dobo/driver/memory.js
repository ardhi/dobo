import { Query } from 'mingo'

async function memoryDriverFactory () {
  const { Driver } = this.app.dobo.baseClass
  const { findIndex, pullAt, omit, has } = this.app.lib._
  const { defaultsDeep } = this.app.lib.aneka

  class MemoryDriver extends Driver {
    constructor (plugin, options) {
      super(plugin)
      this.idGenerator = 'ulid'
      this.saving = true
      this.autoSave = []
      this.storage = {}
    }

    async _loadFromFile (model, dir) {
      const { fs } = this.app.lib
      this.autoSave.push(model.name)
      const file = `${dir}/${model.name}.json`
      if (!fs.existsSync(file)) return
      try {
        const data = fs.readFileSync(file, 'utf8')
        this.storage[model.name] = JSON.parse(data)
      } catch (err) {
        this.fatal('cantLoad%s%s', model.name, err.message)
      }
    }

    async sanitizeConnection (conn) {
      await super.sanitizeConnection(conn)
      conn.memory = true
    }

    async init () {
      await super.init()
      const conn = this.plugin.getConnection('memory')
      const models = this.plugin.getModelsByConnection(conn.name)
      const { getPluginDataDir } = this.app.bajo
      const { fs } = this.app.lib
      const pdir = `${getPluginDataDir(this.plugin.ns)}/memDb/data` // persistence dir
      fs.ensureDirSync(pdir)
      conn.autoSave = conn.autoSave ?? []
      for (const model of models) {
        this.storage[model.name] = this.storage[model.name] ?? [] // init empty model
        if (conn.autoSave.includes(model.name)) await this._loadFromFile(model, pdir)
        else await model.loadFixtures()
      }
      if (conn.autoSave.length === 0) return
      setInterval(() => {
        if (!this.saving) return
        this.saving = true
        for (const item of conn.autoSave) {
          const data = this.storage[item]
          fs.writeFileSync(`${pdir}/${item}.json`, JSON.stringify(data), 'utf8')
        }
        this.saving = false
      }, this.plugin.config.memDb.autoSaveDur)
    }

    async _getOldRecord (model, id, options = {}) {
      const idx = findIndex(this.storage[model.name], { _id: id })
      const oldData = this.storage[model.name][idx]
      if (idx === -1) throw this.plugin.error('notFound%s%s', this.plugin.t('record'), `${id}@${model.name}`)
      return { idx, oldData }
    }

    async modelExists (model, options = {}) {
      return { data: has(this.storage, model.name) }
    }

    async buildModel (model, options = {}) {
      if (has(this.storage, model.name)) throw this.plugin.error('exist%s%s', this.plugin.t('model'), model.name)
      this.storage[model.name] = []
      if (options.noResult) return
      return {}
    }

    async clearModel (model, options = {}) {
      if (!has(this.storage, model.name)) throw this.plugin.error('notFound%s%s', this.plugin.t('model'), model.name)
      this.storage[model.name] = []
      if (options.noResult) return
      return {}
    }

    async dropModel (model, options = {}) {
      if (!has(this.storage, model.name)) throw this.plugin.error('notFound%s%s', this.plugin.t('model'), model.name)
      delete this.storage[model.name]
      if (options.noResult) return
      return {}
    }

    async createRecord (model, body = {}, options = {}) {
      const idx = findIndex(this.storage[model.name], { _id: body._id })
      if (idx > -1) throw this.plugin.error('exist%s%s', this.plugin.t('record'), `${body._id}@${model.name}`)
      this.storage[model.name].push(body)
      return { data: body }
    }

    async getRecord (model, id, options = {}) {
      const { oldData: data } = await this._getOldRecord(model, id)
      return { data }
    }

    async updateRecord (model, id, body = {}, options = {}) {
      const { idx, oldData } = await this._getOldRecord(model, id)
      const data = defaultsDeep(body, oldData)
      this.storage[model.name][idx] = data
      return { oldData, data }
    }

    async removeRecord (model, id, options = {}) {
      const { idx, oldData } = await this._getOldRecord(model, id)
      pullAt(this.storage[model.name], idx)
      return { oldData }
    }

    async findRecord (model, filter = {}, options = {}) {
      const { limit, skip, sort, page } = filter
      const { data: count = 0 } = await this.countRecord(model, filter, options)
      const cursor = this._getCursor(model, filter)
      if (sort) cursor.sort(sort)
      if (!options.noLimit) cursor.skip(skip).limit(limit)
      let result = { data: cursor.all(), page, limit, count, pages: Math.ceil(count / limit) }
      if (!options.count) result = omit(result, ['count', 'pages'])
      return result
    }

    async findAllRecord (model, filter = {}, options = {}) {
      const { sort } = await model.preparePagination(filter)
      const { data: count = 0 } = await this.countRecord(model, filter, options)
      const cursor = this._getCursor(model, filter)
      if (sort) cursor.sort(sort)
      let result = { data: cursor.all(), count }
      if (!options.count) result = omit(result, ['count'])
      return result
    }

    async countRecord (model, filter = {}, options = {}) {
      const cursor = this._getCursor(model, filter)
      const data = cursor.all().length
      return { data }
    }

    _getCursor (model, filter) {
      const criteria = filter.query ?? {}
      const q = new Query(criteria, { idKey: '_id' })
      return q.find(this.storage[model.name])
    }
  }

  return MemoryDriver
}

export default memoryDriverFactory
