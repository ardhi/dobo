import { Query } from 'mingo'

async function memoryDriverFactory () {
  const { DoboDriver } = this.app.baseClass
  const { findIndex, pullAt, omit, has } = this.app.lib._
  const { defaultsDeep } = this.app.lib.aneka

  class DoboMemoryDriver extends DoboDriver {
    constructor (plugin, name, options) {
      super(plugin, name, options)
      this.idGenerator = 'ulid'
      this.saving = true
      this.memory = true
      this.storage = {}
      this.support = {
        propType: {
          object: true,
          array: true
        }
      }
    }

    async sanitizeConnection (conn) {
      await super.sanitizeConnection(conn)
      conn.memory = true
    }

    async connect (connection, noRebuild) {
      const conn = this.plugin.getConnection('memory')
      const { fs } = this.app.lib
      const dir = `${this.app.getPluginDataDir(this.plugin.ns)}/memDb/data` // persistence dir
      fs.ensureDirSync(dir)
      conn.persistences = conn.persistences ?? []

      const models = this.plugin.getModelsByConnection(conn.name).map(model => {
        if (conn.persistences.includes(model.name)) model.options.persistence = true
        return model
      })

      for (const model of models) {
        this.storage[model.name] = this.storage[model.name] ?? [] // init empty model
        if (model.options.persistence) {
          const file = `${dir}/${model.name}.json`
          let data = []
          if (fs.existsSync(file)) {
            try {
              data = JSON.parse(fs.readFileSync(file, 'utf8'))
            } catch (err) {}
          }
          if (data.length === 0) await model.loadFixtures({ ignoreError: false })
          else this.storage[model.name] = data
        } else await model.loadFixtures({ ignoreError: false })
      }
      setInterval(() => {
        if (!this.saving) return
        this.saving = true
        for (const model of models) {
          if (!model.options.persistence) continue
          try {
            fs.writeFileSync(`${dir}/${model.name}.json`, JSON.stringify(this.storage[model.name], null, 2), 'utf8')
          } catch (err) {}
        }
        this.saving = false
      }, this.plugin.config.memDb.persistenceDur)
    }

    async _getOldRecord (model, id, options = {}) {
      const idx = findIndex(this.storage[model.name], { _id: id })
      const oldData = this.storage[model.name][idx]
      return { idx, oldData }
    }

    async modelExists (model, options = {}) {
      return { data: has(this.storage, model.name) }
    }

    async buildModel (model, options = {}) {
      if (has(this.storage, model.name)) throw this.plugin.error('exist%s%s', this.plugin.t('model'), model.name)
      this.storage[model.name] = []
      if (options.noResult) return
      return { data: true }
    }

    async dropModel (model, options = {}) {
      if (!has(this.storage, model.name)) throw this.plugin.error('notFound%s%s', this.plugin.t('model'), model.name)
      delete this.storage[model.name]
      if (options.noResult) return
      return { data: true }
    }

    async createRecord (model, body = {}, options = {}) {
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

    async clearRecord (model, options = {}) {
      this.storage[model.name] = []
      if (options.noResult) return
      return { data: true }
    }

    async findRecord (model, filter = {}, options = {}) {
      const { limit, skip, sort, page } = filter
      const { data: count = 0 } = await this.countRecord(model, filter, options)
      const cursor = this._getCursor(model, filter)
      if (sort) cursor.sort(sort)
      cursor.skip(skip).limit(limit)
      let result = { data: cursor.all(), page, limit, count, pages: Math.ceil(count / limit) }
      if (!options.count) result = omit(result, ['count', 'pages'])
      return result
    }

    async findAllRecord (model, filter = {}, options = {}) {
      const { hardCap } = this.app.dobo.getDefaultValues(options)
      filter.limit = hardCap
      delete filter.skip
      delete filter.page
      const { sort } = filter
      const cursor = this._getCursor(model, filter)
      cursor.limit(filter.limit)
      if (sort) cursor.sort(sort)
      return { data: cursor.all(), hardCapped: true }
    }

    async countRecord (model, filter = {}, options = {}) {
      const cursor = this._getCursor(model, filter)
      const data = cursor.all().length
      return { data }
    }

    async createAggregate (model, filter = {}, params = {}, options = {}) {
      const item = await this.findAllRecord(model, filter, options)
      const result = this.app.dobo.calcAggregate({ data: item.data, ...params })
      return { data: result }
    }

    async createHistogram (model, filter = {}, params = {}, options = {}) {
      const item = await this.findAllRecord(model, filter, options)
      const result = this.app.dobo.calcHistogram({ data: item.data, ...params })
      return { data: result }
    }

    _getCursor (model, filter) {
      const criteria = filter.query ?? {}
      const q = new Query(criteria, { idKey: '_id' })
      return q.find(this.storage[model.name] ?? [])
    }
  }

  this.app.baseClass.DoboMemoryDriver = DoboMemoryDriver
  return DoboMemoryDriver
}

export default memoryDriverFactory
