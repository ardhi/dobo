/**
 * Sanitize record to conform with the model's definition
 *
 * @method
 * @async
 * @param {Object} [record] - Record object
 * @param {Array} [options.fields] - Array of field names to be picked
 * @param {Object} [options.hidden=[]] - Additional fields to be hidden in addition the one defined in model
 * @param {boolean} [options.forceNoHidden] - Force ALL fields to be picked, thus ignoring hidden fields
 * @returns {Object}
 */
async function sanitizeRecord (record = {}, opts = {}) {
  const { fields = [], hidden = [], forceNoHidden } = opts
  const { isEmpty, map, without } = this.app.lib._
  const { fillObject } = this.app.lib.aneka
  const allHidden = forceNoHidden ? [] : without([...this.hidden, ...hidden], 'id')
  let newFields = [...fields]
  if (isEmpty(newFields)) newFields = map(this.properties, prop => prop.name)
  if (!newFields.includes('id')) newFields.unshift('id')
  newFields = without(newFields, ...allHidden)
  const body = fillObject(record, newFields, null)
  const newRecord = await this.sanitizeBody({ body, noDefault: true })
  if (record._ref) newRecord._ref = record._ref
  return newRecord
}

export default sanitizeRecord
