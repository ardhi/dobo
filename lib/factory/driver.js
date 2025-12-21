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
  const { Tools } = this.app.lib
  const { cloneDeep } = this.app.lib._

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
    }

    init = async (noRebuild) => {}
    /**
     * Sanitize connection info
     *
     * @method
     * @param {Object} input
     * @returns {Object} Sanitized connection object
     */
    sanitizeConnectionInfo = async (info) => {
    }

    sanitizeModelSchema = async (schema) => {
    }

    sanitizeIdField = async model => {
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

    // Internal calls that will be called by model

    _modelExists = async (model, options = {}) => {
      return await this.modelExists(model, options)
    }

    _buildModel = async (model, options = {}) => {
      return await this.buildModel(model, options)
    }

    _clearModel = async (model, options = {}) => {
      return await this.clearModel(model, options)
    }

    _dropModel = async (model, options = {}) => {
      return await this.dropModel(model, options)
    }

    _createRecord = async (model, body = {}, options = {}) => {
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

    _getRecord = async (model, id, options = {}) => {
      const result = await this.getRecord(model, id, options)
      result.data = convertIdOut.call(this, result.data)
      return result
    }

    _updateRecord = async (model, id, body = {}, options = {}) => {
      if (!this.uniqueIndexSupport) await checkUnique.call(this, model, body, options)
      const result = await this.updateRecord(model, id, body, options)
      result.oldData = convertIdOut.call(this, result.oldData)
      result.data = convertIdOut.call(this, result.data)
      return result
    }

    _upsertRecord = async (model, body = {}, options = {}) => {
      if (!this.uniqueIndexSupport) await checkUnique.call(this, model, body, options)
      const result = await this.upsertRecord(model, body, options)
      if (result.oldData) result.oldData = convertIdOut.call(this, result.oldData)
      result.data = convertIdOut.call(this, result.data)
      return result
    }

    _removeRecord = async (model, id, options = {}) => {
      const result = await this.removeRecord(model, id, options)
      result.oldData = convertIdOut.call(this, result.oldData)
      return result
    }

    _findRecord = async (model, filter = {}, options = {}) => {
      handleRegexInFilter.call(this, filter)
      const result = await this.findRecord(model, filter, options)
      if (!options.noResult) {
        for (const idx in result.data) {
          result.data[idx] = convertIdOut.call(this, result.data[idx])
        }
      }
      return result
    }

    _findAllRecord = async (model, filter = {}, options = {}) => {
      handleRegexInFilter.call(this, filter)
      const result = await this.findAllRecord(model, filter, options)
      if (!options.noResult) {
        for (const idx in result.data) {
          result.data[idx] = convertIdOut.call(this, result.data[idx])
        }
      }
      return result
    }

    _countRecord = async (model, filter = {}, options = {}) => {
      handleRegexInFilter.call(this, filter)
      return await this.countRecord(model, filter, options)
    }

    _createAggregate = async (model, filter = {}, options = {}) => {
      return await this.createAggregate(model, filter, options)
    }

    _createHistogram = async (model, filter = {}, options = {}) => {
      return await this.createHistogram(model, filter, options)
    }

    // Public calls that need to be implemented by child drivers

    modelExists = async (model, options = {}) => {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'modelExists')
    }

    buildModel = async (model, options = {}) => {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'buildModel')
    }

    clearModel = async (model, options = {}) => {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'clearModel')
    }

    dropModel = async (model, options = {}) => {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'dropModel')
    }

    createRecord = async (model, body = {}, options = {}) => {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'createRecord')
    }

    getRecord = async (model, id, options = {}) => {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'getRecord')
    }

    updateRecord = async (model, id, body = {}, options = {}) => {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'updateRecord')
    }

    removeRecord = async (model, id, options = {}) => {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'removeRecord')
    }

    findRecord = async (model, filter = {}, options = {}) => {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'findRecord')
    }

    countRecord = async (model, filter = {}, options = {}) => {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'countRecord')
    }

    createAggregate = async (model, filter = {}, options = {}) => {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'createAggregate')
    }

    createHistogram = async (model, filter = {}, options = {}) => {
      throw this.plugin.error('notImplemented%s%s', this.app.t('method'), 'createHistogram')
    }
  }

  return Driver
}
