import crypto from 'crypto'
import { ulid } from 'ulid'
import { v4 as uuidv4, v7 as uuidv7 } from 'uuid'

const defIdField = {
  name: '_id',
  type: 'string',
  maxLength: 50,
  required: true,
  index: 'primary'
}

async function driverFactory () {
  const { Tools } = this.app.baseClass
  const { cloneDeep, has, uniq, without, isEmpty } = this.app.lib._
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
        uniqueIndex: false
      }
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
      conn.memory = false
    }

    sanitizeBody (model, body = {}) {
      const item = cloneDeep(body)
      if (has(item, 'id') && this.idField.name !== 'id') {
        item[this.idField.name] = item.id
        delete item.id
      }
      for (const prop of model.properties) {
        if (isSet(item[prop.name]) && !this.support.propType[prop.type]) {
          if (prop.type === 'datetime') item[prop.name] = item[prop.name].toISOString()
          else if (['object', 'array'].includes(prop.type)) item[prop.name] = JSON.stringify(item[prop.name])
        }
      }
      return item
    }

    sanitizeRecord (model, record = {}) {
      const item = { ...record }
      if (has(item, this.idField.name) && this.idField.name !== 'id') {
        item.id = item[this.idField.name]
        delete item[this.idField.name]
      }
      for (const prop of model.properties) {
        if (isSet(item[prop.name]) && !this.support.propType[prop.type]) {
          try {
            if (prop.type === 'datetime') item[prop.name] = new Date(item[prop.name])
            else if (['object', 'array'].includes(prop.type)) item[prop.name] = JSON.parse(item[prop.name])
          } catch (err) {
            item[prop.name] = null
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
        const resp = await this.findRecord(model, { query, limit: 1 }, options)
        const data = resp.data[0]
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

    async _createRecord (model, body = {}, options = {}) {
      const { isSet, generateId } = this.app.lib.aneka
      const { pick, isFunction } = this.app.lib._
      const prop = model.properties.find(p => p.name === 'id')
      if (!isSet(body.id) && prop.type === 'string') {
        if (options.checksumId) {
          if (options.checksumId === true) options.checksumId = Object.keys(body)
          const checksum = pick(body, options.checksumId)
          body.id = crypto.createHash('md5').update(JSON.stringify(checksum)).digest('hex')
        } else if (this.idGenerator) {
          if (['uuid', 'uuidv4'].includes(this.idGenerator)) body.id = uuidv4()
          else if (['uuidv7'].includes(this.idGenerator)) body.id = uuidv7()
          else if (this.idGenerator === 'generateId') body.id = generateId()
          else if (isFunction(this.idGenerator)) body.id = await this.idGenerator(model, body, options)
        }
        if (!body.id) body.id = ulid()
        body.id = body.id.slice(0, prop.maxLength)
      }
      if (!this.uniqueIndexSupport) await this._checkUnique(model, body, options)
      for (const prop of model.properties) {
        if (!isSet(body[prop.name]) && isSet(prop.default)) {
          if (isFunction(prop.default)) body[prop.name] = await prop.default.call(model)
          else if (typeof prop.default === 'string') {
            if (['now()', 'current_timestamp()'].includes(prop.default.toLowerCase()) && ['datetime', 'date', 'timestamp'].includes(prop.type)) {
              body[prop.name] = new Date()
            } else if (['uuid()', 'uuidv4()'].includes(prop.default.toLowerCase()) && prop.type === 'string') {
              body[prop.name] = uuidv4().slice(0, prop.maxLength)
            } else if (['uuidv7()'].includes(prop.default.toLowerCase()) && prop.type === 'string') {
              body[prop.name] = uuidv7().slice(0, prop.maxLength)
            } else if (['ulid()'].includes(prop.default.toLowerCase()) && prop.type === 'string') {
              body[prop.name] = ulid().slice(0, prop.maxLength)
            } else if (prop.default.toLowerCase() === 'generateId' && prop.type === 'string') {
              body[prop.name] = generateId()
            }
          }
          body[prop.name] = isFunction(prop.default) ? await prop.default.call(model) : prop.default
        }
      }
      if (isSet(body.id)) {
        const resp = await this.getRecord(model, body.id, { noHook: true })
        if (!isEmpty(resp.data)) throw this.plugin.error('recordExists%s%s', body.id, model.name)
      }
      const result = await this.createRecord(model, this.sanitizeBody(model, body), options)
      if (options.noResult) return
      result.data = this.sanitizeRecord(model, result.data)
      return result
    }

    async _getRecord (model, id, options = {}) {
      const result = await this.getRecord(model, id, options)
      if (isEmpty(result.data) && options.throwNotFound) throw this.plugin.error('recordNotFound%s%s', id, model.name)
      result.data = this.sanitizeRecord(model, result.data)
      return result
    }

    async _updateRecord (model, id, body = {}, options = {}) {
      if (!this.support.uniqueIndex) await this._checkUnique(model, body, options)
      const resp = await this.getRecord(model, id, { noHook: true })
      if (!resp.data) throw this.plugin.error('recordNotFound%s%s', id, model.name)
      options._data = resp.data
      const result = await this.updateRecord(model, id, this.sanitizeBody(model, body), options)
      if (options.noResult) return
      result.oldData = this.sanitizeRecord(model, result.oldData)
      result.data = this.sanitizeRecord(model, result.data)
      return result
    }

    async _upsertRecord (model, body = {}, options = {}) {
      if (!this.uniqueIndexSupport) await this._checkUnique(model, body, options)
      if (isSet(body.id)) {
        const resp = await this.getRecord(model, body.id, { noHook: true })
        if (!resp.data) throw this.plugin.error('recordNotFound%s%s', body.id, model.name)
        options._data = resp.data
      }
      const result = await this.upsertRecord(model, this.sanitizeBody(model, body), options)
      if (options.noResult) return
      if (result.oldData) result.oldData = this.sanitizeRecord(model, result.oldData)
      result.data = this.sanitizeRecord(model, result.data)
      return result
    }

    async _removeRecord (model, id, options = {}) {
      const resp = await this.getRecord(model, id, { noHook: true })
      if (!resp.data) throw this.plugin.error('recordNotFound%s%s', id, model.name)
      options._data = resp.data
      const result = await this.removeRecord(model, id, options)
      if (options.noResult) return
      result.oldData = this.sanitizeRecord(model, result.oldData)
      return result
    }

    async _clearRecord (model, options = {}) {
      const result = await this.clearRecord(model, options)
      return result
    }

    async _findRecord (model, filter = {}, options = {}) {
      const result = await this.findRecord(model, filter, options)
      for (const idx in result.data) {
        result.data[idx] = this.sanitizeRecord(model, result.data[idx])
      }
      return result
    }

    async _findAllRecord (model, filter = {}, options = {}) {
      const result = await this.findAllRecord(model, filter, options)
      for (const idx in result.data) {
        result.data[idx] = this.sanitizeRecord(model, result.data[idx])
      }
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
      return result
    }

    // Public calls that need to be implemented by child drivers

    async connect (connection, noRebuild) {
    }

    async modelExists (model, options = {}) {
      throw this.plugin.error('notSupported%s%s', this.app.t('method'), 'modelExists')
    }

    async buildModel (model, options = {}) {
      throw this.plugin.error('notSupported%s%s', this.app.t('method'), 'buildModel')
    }

    async dropModel (model, options = {}) {
      throw this.plugin.error('notSupported%s%s', this.app.t('method'), 'dropModel')
    }

    async createRecord (model, body = {}, options = {}) {
      throw this.plugin.error('notSupported%s%s', this.app.t('method'), 'createRecord')
    }

    async getRecord (model, id, options = {}) {
      throw this.plugin.error('notSupported%s%s', this.app.t('method'), 'getRecord')
    }

    async updateRecord (model, id, body = {}, options = {}) {
      throw this.plugin.error('notSupported%s%s', this.app.t('method'), 'updateRecord')
    }

    async removeRecord (model, id, options = {}) {
      throw this.plugin.error('notSupported%s%s', this.app.t('method'), 'removeRecord')
    }

    async clearRecord (model, options = {}) {
      throw this.plugin.error('notSupported%s%s', this.app.t('method'), 'clearRecord')
    }

    async findRecord (model, filter = {}, options = {}) {
      throw this.plugin.error('notSupported%s%s', this.app.t('method'), 'findRecord')
    }

    async countRecord (model, filter = {}, options = {}) {
      throw this.plugin.error('notSupported%s%s', this.app.t('method'), 'countRecord')
    }

    async createAggregate (model, filter = {}, params = {}, options = {}) {
      throw this.plugin.error('notSupported%s%s', this.app.t('method'), 'createAggregate')
    }

    async createHistogram (model, filter = {}, params = {}, options = {}) {
      throw this.plugin.error('notSupported%s%s', this.app.t('method'), 'createHistogram')
    }
  }

  this.app.baseClass.DoboDriver = DoboDriver
  return DoboDriver
}

export default driverFactory
