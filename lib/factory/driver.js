import crypto from 'crypto'
import { ulid } from 'ulid'

const defIdField = {
  name: '_id',
  type: 'string',
  maxLength: 50,
  required: true,
  index: { type: 'primary' }
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

function convertIdIn (rec) {
  const { cloneDeep } = this.app.lib._
  const name = this.idField.name
  if (name === 'id') return rec
  const newRec = cloneDeep(rec)
  newRec[name] = newRec.id
  delete newRec.id
  return newRec
}

function convertIdOut (rec) {
  const { cloneDeep } = this.app.lib._
  const name = this.idField.name
  if (name === 'id') return rec
  const newRec = cloneDeep(rec)
  newRec.id = newRec[name]
  delete newRec[name]
  return newRec
}

export async function driverFactory () {
  const { Tools } = this.app.baseClass
  const { cloneDeep } = this.app.lib._
  const { isEmpty, isString } = this.app.lib._

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
      this.propertyNameStrategy = 'camelCase'
      this.collNameStrategy = undefined
    }

    async createClient (noRebuild) {
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

    /**
     * Sanitize model schema
     * @param {Object} schema - Model's
     */
    async sanitizeModel (schema) {
    }

    async sanitizeIdField (model) {
      const idx = model.properties.findIndex(prop => prop.name === 'id')
      if (idx === -1) {
        const idField = cloneDeep(this.idField)
        idField.name = 'id'
        model.properties.unshift(idField)
      } else {
        const idField = model.properties[idx]
        idField.type = idField.type ?? this.idField.type
        if (idField.type === 'string' && this.idField.type === 'string') idField.maxLength = idField.maxLength ?? this.idField.maxLength
        idField.required = this.idField.required
        idField.index = this.idField.index
      }
    }

    async sanitizeFilter (model, filter) {
      handleRegexInFilter.call(this, filter)
      const { limit, skip, sort, page } = await model.preparePagination(filter)
      filter.limit = limit
      filter.skip = skip
      filter.sort = sort
      filter.page = page
    }

    // Internal calls that will be called by model

    async _modelExists (model, options = {}) {
      return await this.modelExists(model, options)
    }

    async _buildModel (model, options = {}) {
      return await this.buildModel(model, options)
    }

    async _clearModel (model, options = {}) {
      return await this.clearModel(model, options)
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
          if (this.idGenerator === 'ulid') body.id = ulid()
          else if (this.idGenerator === 'generateId') body.id = generateId()
          else if (isFunction(this.idGenerator)) body.id = await this.idGenerator(model, body, options)
        }
        body.id = body.id.slice(0, prop.maxLength)
      }
      if (!this.uniqueIndexSupport) await checkUnique.call(this, model, body, options)
      const result = await this.createRecord(model, convertIdIn.call(this, body), options)
      result.data = convertIdOut.call(this, result.data)
      return result
    }

    async _getRecord (model, id, options = {}) {
      const result = await this.getRecord(model, id, options)
      result.data = convertIdOut.call(this, result.data)
      return result
    }

    async _updateRecord (model, id, body = {}, options = {}) {
      if (!this.uniqueIndexSupport) await checkUnique.call(this, model, body, options)
      const result = await this.updateRecord(model, id, body, options)
      result.oldData = convertIdOut.call(this, result.oldData)
      result.data = convertIdOut.call(this, result.data)
      return result
    }

    async _upsertRecord (model, body = {}, options = {}) {
      if (!this.uniqueIndexSupport) await checkUnique.call(this, model, body, options)
      const result = await this.upsertRecord(model, body, options)
      if (result.oldData) result.oldData = convertIdOut.call(this, result.oldData)
      result.data = convertIdOut.call(this, result.data)
      return result
    }

    async _removeRecord (model, id, options = {}) {
      const result = await this.removeRecord(model, id, options)
      result.oldData = convertIdOut.call(this, result.oldData)
      return result
    }

    async _findRecord (model, filter = {}, options = {}) {
      await this.sanitizeFilter(model, filter)
      const result = await this.findRecord(model, filter, options)
      if (!options.noResult) {
        for (const idx in result.data) {
          result.data[idx] = convertIdOut.call(this, result.data[idx])
        }
      }
      return result
    }

    async _findAllRecord (model, filter = {}, options = {}) {
      await this.sanitizeFilter(model, filter)
      const result = await this.findAllRecord(model, filter, options)
      if (!options.noResult) {
        for (const idx in result.data) {
          result.data[idx] = convertIdOut.call(this, result.data[idx])
        }
      }
      return result
    }

    async _countRecord (model, filter = {}, options = {}) {
      await this.sanitizeFilter(model, filter)
      return await this.countRecord(model, filter, options)
    }

    async _createAggregate (model, filter = {}, options = {}) {
      const { aggregateTypes } = this.app.baseClass.Dobo
      const fieldPropTypes = ['integer', 'smallint', 'float', 'double']
      const groupPropTypes = ['string', ...fieldPropTypes]
      await this.sanitizeFilter(model, filter)
      let { group, aggregates = [], field } = options
      if (isString(aggregates)) aggregates = [aggregates]
      options.aggregates = aggregates
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

      return await this.createAggregate(model, filter, options)
    }

    async _createHistogram (model, filter = {}, options = {}) {
      const { histogramTypes } = this.app.baseClass.Dobo
      const { aggregateTypes } = this.app.baseClass.Dobo
      const fieldPropTypes = ['integer', 'smallint', 'float', 'double']
      const groupPropTypes = ['datetime', 'date']
      await this.sanitizeFilter(model, filter)
      let { group, type, field, aggregates = ['count'] } = options
      if (isString(aggregates)) aggregates = [aggregates]
      options.aggregates = aggregates
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
      return await this.createHistogram(model, filter, options)
    }

    // Public calls that need to be implemented by child drivers

    async modelExists (model, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'modelExists')
    }

    async buildModel (model, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'buildModel')
    }

    async clearModel (model, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'clearModel')
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

    async findRecord (model, filter = {}, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'findRecord')
    }

    async countRecord (model, filter = {}, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'countRecord')
    }

    async createAggregate (model, filter = {}, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'createAggregate')
    }

    async createHistogram (model, filter = {}, options = {}) {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'createHistogram')
    }
  }

  return Driver
}
