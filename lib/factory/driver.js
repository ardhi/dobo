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

/**
 * Check uniqueness of fields with unique index
 *
 * @param {Object} [params]
 */
async function checkUnique (model, body = {}, options = {}) {
  const { isSet } = this.app.lib.aneka
  const { filter, map } = this.app.lib._
  const indexes = filter(model.indexes ?? [], idx => idx.type === 'unique')
  for (const index of indexes) {
    const query = {}
    for (const field of index.fields) {
      if (isSet(body[field])) query[field] = body[field]
    }
    const resp = await this.findRecord(model, { query, limit: 1 }, options)
    if (resp.length !== 0) {
      const error = this.app.dobo.t('uniqueConstraintError')
      const details = map(index.fields, field => {
        return { field, error }
      })
      throw this.app.dobo.error(error, { details, body })
    }
  }
}

function handleRegexInFilter (filter) {
  const { isArray } = this.app.lib._
  if (this.idField.name !== 'id') {
    const query = JSON.stringify(filter.query ?? {}, (key, value) => {
      if (value instanceof RegExp) return ['__REGEXP__', value.source, value.flags]
      return value
    }).replaceAll('"id"', `"${this.idField.name}"`)
    try {
      filter.query = JSON.parse(query, (key, value) => {
        if (isArray(value) && value[0] === '__REGEXP__') return new RegExp(value[1], value[2])
        return value
      })
    } catch (err) {}
    const match = JSON.stringify(filter.match ?? {}).replaceAll('"id"', `"${this.idField.name}"`)
    try {
      filter.match = JSON.parse(match)
    } catch (err) {}
  }
}

export async function driverFactory () {
  const { Tools } = this.app.baseClass
  const { cloneDeep, isEmpty, isString, has, uniq, without } = this.app.lib._
  const { isSet } = this.app.lib.aneka

  /**
   * Driver class
   *
   * ```this.plugin``` should be the one who owned this driver
   *
   * @class
   */
  class Driver extends Tools {
    constructor (plugin) {
      super(plugin)
      this.idField = defIdField
      this.propertyType = {}
      this.support = {
        propType: {
          object: false,
          array: false
        }
      }
    }

    async init () {}

    /**
     * Sanitize connection object
     *
     * @method
     * @param {Object} conn - Connection object
     */
    async sanitizeConnection (conn) {
      conn.memory = false
    }

    async sanitizeFilter (model, filter) {
      handleRegexInFilter.call(this, filter)
      const { limit, skip, sort, page } = await model.preparePagination(filter)
      filter.limit = limit
      filter.skip = skip
      filter.sort = sort
      filter.page = page
    }

    sanitizeBody (model, body) {
      const item = cloneDeep(body)
      if (has(item, 'id') && this.idField.name !== 'id') {
        item[this.idField.name] = item.id
        delete item.id
      }
      for (const prop of model.properties) {
        if (isSet(item[prop.name]) && ['object', 'array'].includes(prop.type) && !this.support.propType[prop.type]) {
          item[prop.name] = JSON.stringify(item[prop.name])
        }
      }
      return item
    }

    sanitizeRecord (model, record) {
      const item = { ...record }
      if (has(item, this.idField.name) && this.idField.name !== 'id') {
        item.id = item[this.idField.name]
        delete item[this.idField.name]
      }
      for (const prop of model.properties) {
        if (isSet(item[prop.name]) && ['object', 'array'].includes(prop.type) && !this.support.propType[prop.type]) {
          try {
            item[prop.name] = JSON.parse(item[prop.name])
          } catch (err) {}
        }
      }
      return item
    }

    _getReturningFields (model, { fields = [] } = {}) {
      if (!this.options.returning) return []
      let items = fields.length > 0 ? [...fields] : model.properties.map(prop => prop.name)
      if (!items.includes(this.idField.name)) items.unshift(this.idField.name)
      if (this.idField.name !== 'id') items = without(items, ['id'])
      return uniq(items)
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
      if (!this.uniqueIndexSupport) await checkUnique.call(this, model, body, options)
      const result = await this.createRecord(model, this.sanitizeBody(model, body), options)
      result.data = this.sanitizeRecord(model, result.data)
      return result
    }

    async _getRecord (model, id, options = {}) {
      const result = await this.getRecord(model, id, options)
      result.data = this.sanitizeRecord(model, result.data)
      return result
    }

    async _updateRecord (model, id, body = {}, options = {}) {
      if (!this.uniqueIndexSupport) await checkUnique.call(this, model, body, options)
      const result = await this.updateRecord(model, id, this.sanitizeBody(model, body), options)
      result.oldData = this.sanitizeRecord(model, result.oldData)
      result.data = this.sanitizeRecord(model, result.data)
      return result
    }

    async _upsertRecord (model, body = {}, options = {}) {
      if (!this.uniqueIndexSupport) await checkUnique.call(this, model, body, options)
      const result = await this.upsertRecord(model, this.sanitizeBody(model, body), options)
      if (result.oldData) result.oldData = this.sanitizeRecord(model, result.oldData)
      result.data = this.sanitizeRecord(model, result.data)
      return result
    }

    async _removeRecord (model, id, options = {}) {
      const result = await this.removeRecord(model, id, options)
      result.oldData = this.sanitizeRecord(model, result.oldData)
      return result
    }

    async _clearRecord (model, options = {}) {
      const result = await this.clearRecord(model, options)
      return result
    }

    async _findRecord (model, filter = {}, options = {}) {
      await this.sanitizeFilter(model, filter)
      const result = await this.findRecord(model, filter, options)
      for (const idx in result.data) {
        result.data[idx] = this.sanitizeRecord(model, result.data[idx])
      }
      return result
    }

    async _findAllRecord (model, filter = {}, options = {}) {
      await this.sanitizeFilter(model, filter)
      const result = await this.findAllRecord(model, filter, options)
      for (const idx in result.data) {
        result.data[idx] = this.sanitizeRecord(model, result.data[idx])
      }
      return result
    }

    async _countRecord (model, filter = {}, options = {}) {
      await this.sanitizeFilter(model, filter)
      return await this.countRecord(model, filter, options)
    }

    async _createAggregate (model, filter = {}, params = {}, options = {}) {
      const { aggregateTypes } = this.app.baseClass.Dobo
      const fieldPropTypes = ['integer', 'smallint', 'float', 'double']
      const groupPropTypes = ['string', ...fieldPropTypes]
      await this.sanitizeFilter(model, filter)
      let { group, aggregates = ['count'], field } = params
      if (isString(aggregates)) aggregates = [aggregates]
      params.aggregates = aggregates
      if (isEmpty(group)) throw this.plugin.error('fieldGroupAggregateMissing')
      if (isEmpty(field)) throw this.plugin.error('fieldCalcAggregateMissing')
      if (isEmpty(aggregates)) throw this.plugin.error('aggregateTypesMissing')

      for (const agg of aggregates) {
        if (!aggregateTypes.includes(agg)) throw this.plugin.error('unsupportedAggregateType%s', agg)
      }

      let prop = model.properties.find(p => p.name === group)
      if (!prop) throw this.plugin.error('unknown%s%s', this.plugin.t('field.field'), group)
      if (!groupPropTypes.includes(prop.type)) throw this.plugin.error('allowedPropType%s%s', group, groupPropTypes.join(', '))

      prop = model.properties.find(p => p.name === field)
      if (!prop) throw this.plugin.error('unknown%s%s', this.plugin.t('field.field'), field)
      if (!fieldPropTypes.includes(prop.type)) throw this.plugin.error('allowedPropType%s%s', field, fieldPropTypes.join(', '))

      const result = await this.createAggregate(model, filter, params, options)
      for (const idx in result.data) {
        result.data[idx] = this.sanitizeRecord(model, result.data[idx])
      }
      return result
    }

    async _createHistogram (model, filter = {}, params, options = {}) {
      const { histogramTypes } = this.app.baseClass.Dobo
      const { aggregateTypes } = this.app.baseClass.Dobo
      const fieldPropTypes = ['integer', 'smallint', 'float', 'double']
      const groupPropTypes = ['datetime', 'date']
      await this.sanitizeFilter(model, filter)
      let { group, type, field, aggregates = ['count'] } = params
      if (isString(aggregates)) aggregates = [aggregates]
      params.aggregates = aggregates
      if (isEmpty(group)) throw this.plugin.error('fieldGroupHistogranMissing')
      if (isEmpty(field)) throw this.plugin.error('fieldCalcHistogramMissing')
      if (isEmpty(type)) throw this.plugin.error('histogramTypeMissing')

      if (!histogramTypes.includes(type)) throw this.plugin.error('unsupportedHistogramType%s', type)
      for (const agg of aggregates) {
        if (!aggregateTypes.includes(agg)) throw this.plugin.error('unsupportedAggregateType%s', agg)
      }

      let prop = model.properties.find(p => p.name === group)
      if (!prop) throw this.plugin.error('unknown%s%s', this.plugin.t('field.field'), group)
      if (!groupPropTypes.includes(prop.type)) throw this.plugin.error('allowedPropType%s%s', group, groupPropTypes.join(', '))

      prop = model.properties.find(p => p.name === field)
      if (!prop) throw this.plugin.error('unknown%s%s', this.plugin.t('field.field'), field)
      if (!fieldPropTypes.includes(prop.type)) throw this.plugin.error('allowedPropType%s%s', field, fieldPropTypes.join(', '))
      const result = await this.createHistogram(model, filter, params, options)
      for (const idx in result.data) {
        result.data[idx] = this.sanitizeRecord(model, result.data[idx])
      }
      return result
    }

    // Public calls that need to be implemented by child drivers

    async createClient (connection, noRebuild) {
    }

    async modelExists (model, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'modelExists')
    }

    async buildModel (model, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'buildModel')
    }

    async dropModel (model, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'dropModel')
    }

    async createRecord (model, body = {}, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'createRecord')
    }

    async getRecord (model, id, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'getRecord')
    }

    async updateRecord (model, id, body = {}, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'updateRecord')
    }

    async removeRecord (model, id, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'removeRecord')
    }

    async clearRecord (model, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'clearRecord')
    }

    async findRecord (model, filter = {}, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'findRecord')
    }

    async countRecord (model, filter = {}, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'countRecord')
    }

    async createAggregate (model, filter = {}, params = {}, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'createAggregate')
    }

    async createHistogram (model, filter = {}, params = {}, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'createHistogram')
    }
  }

  return Driver
}
