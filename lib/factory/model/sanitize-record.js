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
  const { isEmpty, map, without, isArray, isFunction, isString, get, cloneDeep } = this.app.lib._
  const { fillObject } = this.app.lib.aneka
  const { callHandler, format } = this.app.bajo
  let allHidden = without([...this.hidden, ...hidden], 'id')
  if (forceNoHidden === true) allHidden = []
  else if (isArray(forceNoHidden)) allHidden = without(allHidden, ...forceNoHidden)
  let newFields = [...fields]
  if (isEmpty(newFields)) newFields = map(this.properties, prop => prop.name)
  if (!newFields.includes('id')) newFields.unshift('id')
  newFields = without(newFields, ...allHidden)
  const body = fillObject(record, newFields, null)
  const newRecord = await this.sanitizeBody({ body, noDefault: true })
  if (opts.formatValue) {
    if (opts.retainOriginalValue) newRecord._orig = cloneDeep(newRecord)
    for (const key in newRecord) {
      const prop = this.getProperty(key)
      if (!prop) continue
      if (prop.format) {
        if (isFunction(prop.format)) newRecord[key] = await prop.format.call(this, newRecord[key], newRecord, opts)
        else if (isString(prop.format)) newRecord[key] = await callHandler(this.plugin, this, newRecord[key], newRecord, opts)
      } else {
        const options = {
          lang: get(opts, 'req.lang'),
          latitude: ['lat', 'latitude'].includes(key),
          longitude: ['lon', 'lng', 'longitude'].includes(key)
        }
        newRecord[key] = format(newRecord[key], prop.type, options)
      }
    }
  }
  if (record._ref) newRecord._ref = record._ref
  return newRecord
}

export default sanitizeRecord
