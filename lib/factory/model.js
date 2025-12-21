import { sanitizeAll, sanitizeRef } from '../collect-models.js'
import clear from './model/clear.js'
import countRecord from './model/count-record.js'
import createRecord from './model/create-record.js'
import drop from './model/drop.js'
import findAllRecord from './model/find-all-record.js'
import findOneRecord from './model/find-one-record.js'
import findRecord from './model/find-record.js'
import getRecord from './model/get-record.js'
import createHistogram from './model/create-histogram.js'
import createAggregate from './model/create-aggregate.js'
import isExists from './model/is-exists.js'
import build from './model/build.js'
import loadFixtures from './model/load-fixtures.js'
import removeRecord from './model/remove-record.js'
import updateRecord from './model/update-record.js'
import createAttachment from './model/create-attachment.js'
import updateAttachment from './model/update-attachment.js'
import getAttachment from './model/get-attachment.js'
import removeAttachment from './model/remove-attachment.js'
import findAttachment from './model/find-attachment.js'
import sanitizeBody from './model/sanitize-body.js'
import sanitizeRecord from './model/sanitize-record.js'
import sanitizeId from './model/sanitize-id.js'
import preparePagination from './model/prepare-pagination.js'
import upsertRecord from './model/upsert-record.js'
import listAttachment from './model/list-attachment.js'
import validate from './model/validate.js'

/**
 * @typedef {string} TRecordSortKey
 */

/**
 * Key value pairs used as sort information:
 * - Key represent model's field name
 * - value represent its sort order: ```1``` for ascending order, and ```-1``` for descending order
 *
 * Example: to sort by firstName (ascending) and lastName (descending)
 * ```javascript
 * const sort = {
 *   firstName: 1,
 *   lastName: -1
 * }
 * ```
 *
 * @typedef {Object.<string, TRecordSortKey>} TRecordSort
 */

/**
 * @typedef {Object} TRecordPagination
 * @property {number} limit - Number of records per page
 * @property {number} page - Page number
 * @property {number} skip - Records to skip
 * @property {TRecordSort} sort - Sort order
 */

async function modelFactory () {
  const { Tools } = this.app.lib
  const { defaults } = this.app.lib._
  /**
   * Feature class
   *
   * ```this.plugin``` should be the one who owned this driver
   *
   * @class
   */
  class Model extends Tools {
    constructor (plugin, options) {
      super(plugin)
      defaults(this, options)
      this.driver = this.connection.driver
      this.cacheable = this.cacheable ?? this.driver.cacheable ?? true

      this.build = this.build.bind(this)
      this.clear = this.clear.bind(this)
      this.isExists = this.isExists.bind(this)
      this.drop = this.drop.bind(this)

      this.createRecord = this.createRecord.bind(this)
      this.getRecord = this.getRecord.bind(this)
      this.updateRecord = this.updateRecord.bind(this)
      this.upsertRecord = this.upsertRecord.bind(this)
      this.removeRecord = this.removeRecord.bind(this)
      this.findRecord = this.findRecord.bind(this)
      this.findOneRecord = this.findOneRecord.bind(this)
      this.findAllRecord = this.findAllRecord.bind(this)
      this.createAggregate = this.createAggregate.bind(this)
      this.createHistogram = this.createHistogram.bind(this)
      this.countRecord = this.countRecord.bind(this)

      this.createAttachment = this.createAttachment.bind(this)
      this.getAttachment = this.getAttachment.bind(this)
      this.updateAttachment = this.updateAttachment.bind(this)
      this.removeAttachment = this.removeAttachment.bind(this)
      this.findAttachment = this.findAttachment.bind(this)
      this.listAttachment = this.listAttachment.bind(this)

      this.loadFixtures = this.loadFixtures.bind(this)
      this.sanitizeRecord = this.sanitizeRecord.bind(this)
      this.sanitizeBody = this.sanitizeBody.bind(this)
      this.sanitizeId = this.sanitizeId.bind(this)
      this.preparePagination = this.preparePagination.bind(this)
      this.validate = this.validate.bind(this)
    }

    sanitizeObjectDef = async (obj) => {
      await sanitizeAll.call(this.app.dobo, obj)
    }

    sanitizeRef = async (obj, fatal = true) => {
      await sanitizeRef.call(this.app.dobo, obj, this.app.dobo.schemas, fatal)
    }

    getProperty = (name) => {
      return this.properties.find(prop => prop.name === name)
    }

    hasProperty = (name) => {
      return !!this.getProperty(name)
    }

    build = build
    clear = clear
    isExists = isExists
    drop = drop

    createRecord = createRecord
    getRecord = getRecord
    updateRecord = updateRecord
    upsertRecord = upsertRecord
    removeRecord = removeRecord
    findRecord = findRecord
    findOneRecord = findOneRecord
    findAllRecord = findAllRecord

    createAggregate = createAggregate
    createHistogram = createHistogram
    countRecord = countRecord

    createAttachment = createAttachment
    getAttachment = getAttachment
    updateAttachment = updateAttachment
    removeAttachment = removeAttachment
    findAttachment = findAttachment
    listAttachment = listAttachment

    loadFixtures = loadFixtures
    sanitizeRecord = sanitizeRecord
    sanitizeBody = sanitizeBody
    sanitizeId = sanitizeId
    preparePagination = preparePagination
    validate = validate

    // aliases
    findRecords = async (filter, options) => {
      return await this.findRecord(filter, options)
    }

    findAllRecords = async (filter, options) => {
      return await this.findAllRecord(filter, options)
    }

    /**
     * Dispose internal references
     */
    dispose = () => {
      super.dispose()
      this.connection = null
      this.driver = null
    }
  }

  return Model
}

export default modelFactory
