import { ulid } from 'ulid'
import { v4 as uuidv4, v7 as uuidv7 } from 'uuid'
import crypto from 'crypto'

const defIdField = {
  name: '_id',
  type: 'string',
  maxLength: 50,
  required: true,
  index: 'primary'
}

async function driverFactory () {
  const { Tools } = this.app.baseClass
  const { pick, cloneDeep, has, uniq, without, isEmpty, omit, isFunction } = this.app.lib._
  const { isSet } = this.app.lib.aneka

  /**
   * Driver class
   *
   * ```this.plugin``` should be the one who owned this driver
   *
   * @class
   */
  class DoboDriver extends Tools {
    constructor (plugin, name, options = {}) {
      super(plugin)
      this.name = name
      this.idField = cloneDeep(defIdField)
      this.propertyType = {}
      this.support = {
        propType: {
          object: false,
          array: false,
          datetime: true
        },
        search: false,
        uniqueIndex: false,
        nullableField: true,
        transaction: false
      }
      this.useUtc = false
      this.maxChunkSize = 500
      this.memory = false
      this.options = options
    }

    /**
     * Sanitize connection object
     *
     * @method
     * @param {Object} conn - Connection object
     */
    async sanitizeConnection (conn) {
      conn.proto = conn.proto ?? 'http' // used by driver that use url based connection
      conn.memory = false
    }

    sanitizeBody (model, body = {}, partial) {
      const { keys, pick } = this.app.lib._
      const item = cloneDeep(body)
      let newId = false
      if (has(item, 'id') && this.idField.name !== 'id') {
        item[this.idField.name] = item.id
        newId = true
      }
      for (const prop of model.properties) {
        if (item[prop.name] === 'null') item[prop.name] = null
        if (!isSet(item[prop.name]) && !this.support.nullableField) {
          switch (prop.type) {
            case 'datetime': item[prop.name] = new Date(0); break
            case 'float':
            case 'double': item[prop.name] = 0; break
            case 'string':
            case 'text': item[prop.name] = ''; break
            case 'object': item[prop.name] = {}; break
            case 'array': item[prop.name] = []; break
          }
        }
        if (isSet(item[prop.name]) && !this.support.propType[prop.type]) {
          if (prop.type === 'datetime') item[prop.name] = item[prop.name].toISOString()
          else if (['object', 'array'].includes(prop.type)) item[prop.name] = JSON.stringify(item[prop.name])
        }
      }
      const result = partial ? pick(item, keys(body)) : item
      if (newId) delete result.id
      return result
    }

    sanitizeRecord (model, record = {}) {
      const { dayjs } = this.app.lib
      const { isString } = this.app.lib._
      const item = { ...record }
      if (has(item, this.idField.name) && this.idField.name !== 'id') {
        item.id = item[this.idField.name]
        delete item[this.idField.name]
      }
      for (const prop of model.properties) {
        if (isSet(item[prop.name])) {
          if (!this.support.propType[prop.type]) {
            try {
              if (prop.type === 'datetime') {
                const dt = this.useUtc ? dayjs.utc(item[prop.name]) : dayjs(item[prop.name])
                item[prop.name] = dt.toDate()
              } else if (['object', 'array'].includes(prop.type)) item[prop.name] = JSON.parse(item[prop.name])
            } catch (err) {
              item[prop.name] = null
            }
          }
          if (prop.type === 'datetime' && isString(item[prop.name])) {
            const dt = this.useUtc ? dayjs.utc(item[prop.name]) : dayjs(item[prop.name])
            item[prop.name] = dt.toDate()
          }
        }
      }
      return item
    }

    _getReturningFields (model, { fields = [] } = {}) {
      if (!this.support.returning) return []
      let items = fields.length > 0 ? [...fields] : model.properties.map(prop => prop.name)
      if (!items.includes(this.idField.name)) items.unshift(this.idField.name)
      if (this.idField.name !== 'id') items = without(items, ['id'])
      return uniq(items)
    }

    /**
     * Check uniqueness of fields with unique index
     *
     * @param {Object} [params]
     */
    _checkUnique = async (model, body = {}, options = {}) => {
      const { isSet } = this.app.lib.aneka
      const { filter, map, isEmpty, forOwn } = this.app.lib._
      const indexes = filter(model.indexes ?? [], idx => idx.type === 'unique')
      for (const index of indexes) {
        const query = {}
        for (const field of index.fields) {
          if (isSet(body[field])) query[field] = body[field]
        }
        if (isEmpty(query)) continue
        const data = await this.findOneRecord(model, { query }, options)
        if (!isEmpty(data)) {
          if (['updateRecord', 'upsertRecord'].includes(options.action)) {
            let eq = true
            forOwn(query, (v, k) => {
              if (data[k] !== v) eq = false
            })
            if (!eq) continue
          }
          const error = this.app.dobo.t('uniqueConstraintError')
          const details = map(index.fields, field => {
            return { field, error }
          })
          throw this.app.dobo.error(error, { details, body })
        }
      }
    }

    // Internal calls that will be called by model

    async _modelExists (model, options = {}) {
      return await this.modelExists(model, options)
    }

    async _buildModel (model, options = {}) {
      return await this.buildModel(model, options)
    }

    async _dropModel (model, options = {}) {
      return await this.dropModel(model, options)
    }

    getRealFields (model) {
      return model.getProperties({ noVirtual: true, namesOnly: true })
    }

    getVirtualFields (model) {
      return model.getVirtualProperties({ namesOnly: true })
    }

    async _prepBodyForCreate (model, body = {}, options = {}) {
      const { isSet, generateId } = this.app.lib.aneka
      for (const prop of model.getProperties({ noVirtual: true })) {
        if (!isSet(body[prop.name]) && isSet(prop.default)) {
          if (isFunction(prop.default)) body[prop.name] = await prop.default.call(model)
          else if (typeof prop.default !== 'string') body[prop.name] = prop.default
          else {
            if (['now'].includes(prop.default) && prop.type === 'datetime') {
              body[prop.name] = new Date()
            } else if (['uuid', 'uuidv4'].includes(prop.default) && prop.type === 'string') {
              body[prop.name] = uuidv4().slice(0, prop.maxLength)
            } else if (prop.default === 'uuidv7' && prop.type === 'string') {
              body[prop.name] = uuidv7().slice(0, prop.maxLength)
            } else if (prop.default === 'ulid' && prop.type === 'string') {
              body[prop.name] = ulid().slice(0, prop.maxLength)
            } else if (prop.default === 'generateid' && prop.type === 'string') {
              body[prop.name] = generateId()
            } else if (prop.default.startsWith('md5:') && prop.type === 'string') {
              const [, field] = prop.default.split(':')
              const fields = field.split(',')
              if (model.properties.filter(item => fields.includes(item.name)).length === fields.length) {
                const values = fields.map(f => body[f])
                body[prop.name] = crypto.createHash('md5').update(values.join(':')).digest('hex')
              }
            } else {
              body[prop.name] = prop.default
            }
          }
        }
      }
      return pick(body, this.getRealFields(model))
    }

    async _prepIdForCreate (model, body = {}, options = {}) {
      const { isSet, generateId } = this.app.lib.aneka
      const { isFunction } = this.app.lib._
      const prop = model.properties.find(p => p.name === 'id')
      if (!isSet(body.id) && prop.type === 'string') {
        if (this.idGenerator) {
          if (['uuid', 'uuidv4'].includes(this.idGenerator)) body.id = uuidv4()
          else if (['uuidv7'].includes(this.idGenerator)) body.id = uuidv7()
          else if (this.idGenerator === 'generateId') body.id = generateId()
          else if (isFunction(this.idGenerator)) body.id = await this.idGenerator(model, body, options)
        }
        if (!body.id) body.id = ulid()
        body.id = body.id.slice(0, prop.maxLength)
      }
    }

    _injectMeta (result = {}, options = {}) {
      result.warnings = result.warnings ?? []
      result.warnings.push(...(options.warnings ?? []))
    }

    async _createRecord (model, input = {}, options = {}) {
      const { isSet } = this.app.lib.aneka
      let body = await this._prepBodyForCreate(model, input, options)
      await this._prepIdForCreate(model, body, options)
      if (!options.noUniqueCheck) {
        if (!this.support.uniqueIndex) await this._checkUnique(model, body, options)
      }
      if (!options.noIdCheck && isSet(body.id)) {
        const resp = await this.getRecord(model, body.id, { noMagic: true })
        if (!isEmpty(resp.data)) throw this.plugin.error('recordExists%s%s', body.id, model.name)
      }
      body = this.sanitizeBody(model, body)
      const result = await this.createRecord(model, body, options)
      if (options.noResult) return
      result.data = this.sanitizeRecord(model, result.data)
      this._injectMeta(result, options)
      return result
    }

    async _bulkCreateRecords (model, bodies = [], options = {}) {
      const { chunk } = this.app.lib._
      let { chunkSize = this.maxChunkSize } = options
      if (chunkSize > this.maxChunkSize) chunkSize = this.maxChunkSize
      for (const idx in bodies) {
        const body = await this._prepBodyForCreate(model, bodies[idx], options)
        await this._prepIdForCreate(model, body, options)
        bodies[idx] = this.sanitizeBody(model, body)
      }
      const items = chunk(bodies, chunkSize)
      for (const item of items) {
        await this.bulkCreateRecord(model, item, options)
      }
    }

    async _getRecord (model, id, options = {}) {
      const result = await this.getRecord(model, id, options)
      if (isEmpty(result.data) && options.throwNotFound) throw this.plugin.error('recordNotFound%s%s', id, model.name)
      result.data = this.sanitizeRecord(model, result.data)
      this._injectMeta(result, options)
      return result
    }

    async _updateRecord (model, id, input = {}, options = {}) {
      let body = omit(input, this.getVirtualFields(model))
      if (!options.noUniqueCheck) {
        if (!this.support.uniqueIndex) await this._checkUnique(model, body, options)
      }
      if (!options._data) {
        const resp = await this.getRecord(model, id, { noMagic: true })
        if (!resp.data) throw this.plugin.error('recordNotFound%s%s', id, model.name)
        options._data = resp.data
      }
      body = this.sanitizeBody(model, body, true)
      delete body.id
      const result = await this.updateRecord(model, id, body, options)
      if (options.noResult) return
      result.oldData = this.sanitizeRecord(model, result.oldData)
      result.data = this.sanitizeRecord(model, result.data)
      this._injectMeta(result, options)
      return result
    }

    async _upsertRecord (model, input = {}, options = {}) {
      let body = omit(input, this.getVirtualFields(model))
      if (!options.noUniqueCheck) {
        if (!this.uniqueIndexSupport) await this._checkUnique(model, body, options)
      }
      if (isSet(body.id)) {
        if (!options._data) {
          const resp = await this.getRecord(model, body.id, { noMagic: true })
          if (!resp.data) throw this.plugin.error('recordNotFound%s%s', body.id, model.name)
          options._data = resp.data
        }
      }
      body = this.sanitizeBody(model, body)
      const result = await this.upsertRecord(model, body, options)
      if (options.noResult) return
      if (result.oldData) result.oldData = this.sanitizeRecord(model, result.oldData)
      result.data = this.sanitizeRecord(model, result.data)
      this._injectMeta(result, options)
      return result
    }

    async _removeRecord (model, id, options = {}) {
      if (!options._data) {
        const resp = await this.getRecord(model, id, { noMagic: true })
        if (!resp.data) throw this.plugin.error('recordNotFound%s%s', id, model.name)
        options._data = resp.data
      }
      const result = await this.removeRecord(model, id, options)
      if (options.noResult) return
      result.oldData = this.sanitizeRecord(model, result.oldData)
      this._injectMeta(result, options)
      return result
    }

    async _clearRecord (model, options = {}) {
      const result = await this.clearRecord(model, options)
      this._injectMeta(result, options)
      return result
    }

    async _findRecord (model, filter = {}, options = {}) {
      const result = await this.findRecord(model, filter, options)
      for (const idx in result.data) {
        result.data[idx] = this.sanitizeRecord(model, result.data[idx])
      }
      this._injectMeta(result, options)
      return result
    }

    async _findAllRecord (model, filter = {}, options = {}) {
      const result = await this.findAllRecord(model, filter, options)
      for (const idx in result.data) {
        result.data[idx] = this.sanitizeRecord(model, result.data[idx])
      }
      this._injectMeta(result, options)
      return result
    }

    async _countRecord (model, filter = {}, options = {}) {
      return await this.countRecord(model, filter, options)
    }

    async _createAggregate (model, filter = {}, params = {}, options = {}) {
      const fieldPropTypes = ['integer', 'smallint', 'float', 'double']
      const groupPropTypes = ['string', ...fieldPropTypes]
      this.app.dobo.checkAggregateParams(params)
      const { group, field } = params

      let prop = model.properties.find(p => p.name === group)
      if (!prop) throw this.plugin.error('unknown%s%s', this.plugin.t('field.field'), group)
      if (!groupPropTypes.includes(prop.type)) throw this.plugin.error('allowedPropType%s%s', group, groupPropTypes.join(', '))

      prop = model.properties.find(p => p.name === field)
      if (!prop) throw this.plugin.error('unknown%s%s', this.plugin.t('field.field'), field)
      // if (!fieldPropTypes.includes(prop.type)) throw this.plugin.error('allowedPropType%s%s', field, fieldPropTypes.join(', '))

      const result = await this.createAggregate(model, filter, params, options)
      for (const idx in result.data) {
        result.data[idx] = this.sanitizeRecord(model, result.data[idx])
      }
      this._injectMeta(result, options)
      return result
    }

    async _createHistogram (model, filter = {}, params, options = {}) {
      // const fieldPropTypes = ['integer', 'smallint', 'float', 'double']
      const groupPropTypes = ['datetime', 'date']
      this.app.dobo.checkHistogramParams(params)
      const { group, field } = params

      let prop = model.properties.find(p => p.name === group)
      if (!prop) throw this.plugin.error('unknown%s%s', this.plugin.t('field.field'), group)
      if (!groupPropTypes.includes(prop.type)) throw this.plugin.error('allowedPropType%s%s', group, groupPropTypes.join(', '))

      prop = model.properties.find(p => p.name === field)
      if (!prop) throw this.plugin.error('unknown%s%s', this.plugin.t('field.field'), field)
      // if (!fieldPropTypes.includes(prop.type)) throw this.plugin.error('allowedPropType%s%s', field, fieldPropTypes.join(', '))
      const result = await this.createHistogram(model, filter, params, options)
      for (const idx in result.data) {
        result.data[idx] = this.sanitizeRecord(model, result.data[idx])
      }
      this._injectMeta(result, options)
      return result
    }

    // Public calls that need to be implemented by child drivers

    async connect (connection, noRebuild) {
    }

    async modelExists (model, options = {}) {
      throw this.plugin.error('notSupportedDriver%s%s%s', this.app.t('method'), 'modelExists', this.name)
    }

    async buildModel (model, options = {}) {
      throw this.plugin.error('notSupportedDriver%s%s%s', this.app.t('method'), 'buildModel', this.name)
    }

    async dropModel (model, options = {}) {
      throw this.plugin.error('notSupportedDriver%s%s%s', this.app.t('method'), 'dropModel', this.name)
    }

    async createRecord (model, body = {}, options = {}) {
      throw this.plugin.error('notSupportedDriver%s%s%s', this.app.t('method'), 'createRecord', this.name)
    }

    async getRecord (model, id, options = {}) {
      throw this.plugin.error('notSupportedDriver%s%s%s', this.app.t('method'), 'getRecord', this.name)
    }

    async updateRecord (model, id, body = {}, options = {}) {
      throw this.plugin.error('notSupportedDriver%s%s%s', this.app.t('method'), 'updateRecord', this.name)
    }

    async removeRecord (model, id, options = {}) {
      throw this.plugin.error('notSupportedDriver%s%s%s', this.app.t('method'), 'removeRecord', this.name)
    }

    async clearRecord (model, options = {}) {
      throw this.plugin.error('notSupportedDriver%s%s%s', this.app.t('method'), 'clearRecord', this.name)
    }

    async findRecord (model, filter = {}, options = {}) {
      throw this.plugin.error('notSupportedDriver%s%s%s', this.app.t('method'), 'findRecord', this.name)
    }

    async bulkCreateRecord (model, bodies = [], options = {}) {
      throw this.plugin.error('notSupportedDriver%s%s%s', this.app.t('method'), 'bulkCreateRecord', this.name)
    }

    async countRecord (model, filter = {}, options = {}) {
      throw this.plugin.error('notSupportedDriver%s%s%s', this.app.t('method'), 'countRecord', this.name)
    }

    async createAggregate (model, filter = {}, params = {}, options = {}) {
      throw this.plugin.error('notSupportedDriver%s%s%s', this.app.t('method'), 'createAggregate', this.name)
    }

    async createHistogram (model, filter = {}, params = {}, options = {}) {
      throw this.plugin.error('notSupportedDriver%s%s%s', this.app.t('method'), 'createHistogram', this.name)
    }

    async transaction (model, handler, ...args) {
      throw this.plugin.error('notSupportedDriver%s%s%s', this.app.t('method'), 'transaction', this.name)
    }

    async dispose () {
      await super.dispose()
    }
  }

  class DoboNullDriver extends DoboDriver {
    constructor (plugin, name = 'null', options = {}) {
      super(plugin, name, options)
      this.memory = true
    }
  }

  this.app.baseClass.DoboDriver = DoboDriver
  this.app.baseClass.DoboNullDriver = DoboNullDriver
}

export default driverFactory
