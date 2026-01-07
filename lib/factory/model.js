import actionFactory from './action.js'
import { sanitizeAll, sanitizeRef } from '../collect-models.js'
import clearRecord from './model/clear-record.js'
import countRecord from './model/count-record.js'
import createRecord from './model/create-record.js'
import drop from './model/drop.js'
import findAllRecord from './model/find-all-record.js'
import findOneRecord from './model/find-one-record.js'
import findRecord from './model/find-record.js'
import getRecord from './model/get-record.js'
import createHistogram from './model/create-histogram.js'
import createAggregate from './model/create-aggregate.js'
import exists from './model/exists.js'
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
  const { Tools } = this.app.baseClass
  const { defaults } = this.app.lib._

  const Action = await actionFactory.call(this)

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
    }

    action = (name, ...args) => {
      const action = new Action(this, name, ...args)
      return action
    }

    sanitizeObjectDef = async (obj) => {
      await sanitizeAll.call(this.app.dobo, obj)
    }

    sanitizeRef = async (obj, fatal = true) => {
      await sanitizeRef.call(this.app.dobo, obj, this.app.dobo.models, fatal)
    }

    getProperty = (name) => {
      return this.properties.find(prop => prop.name === name)
    }

    hasProperty = (name) => {
      return !!this.getProperty(name)
    }

    build = build
    exists = exists
    drop = drop

    createRecord = createRecord
    getRecord = getRecord
    updateRecord = updateRecord
    upsertRecord = upsertRecord
    removeRecord = removeRecord
    clearRecord = clearRecord
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
    validate = validate

    // aliases
    deleteRecord = removeRecord
    clearRecords = clearRecord
    countRecords = countRecord
    findRecords = findRecord
    findAllRecords = findAllRecord
    listAttachments = listAttachment

    getField = (name) => this.getProperty(name)
    hasField = (name) => this.hasProperty(name)

    dispose () {
      super.dispose()
      this.connection = null
      this.driver = null
    }
  }

  return Model
}

export default modelFactory
