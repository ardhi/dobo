/**
 * Sanitize a record object based on the model's properties and rules.
 * @method
 * @async
 * @memberof DoboModel
 * @param {Object} [record] - Record object
 * @param {DoboModel.TOptions} [opts={}] - Options object
 * @param {Array} [opts.fields] - If not empty, only these fields will be included in the sanitized record
 * @param {Array<string>} [opts.hidden=[]] - List of fields to hide from the sanitized record
 * @param {boolean} [opts.forceNoHidden=false] - If `true`, force ALL fields to be picked, thus ignoring hidden fields. If an array, force all fields except those in the array to be picked.
 * @param {boolean} [opts.fmt=false] - If `true`, add a `_fmt` property to the sanitized record with formatted values automatically based on the model's properties and rules
 * @param {Object} [opts.req] - Request object, used for formatting values based on request context
 * @param {Object} [opts.intl] - Internationalization options, used for formatting values based on i18n context
 * @param {string} [opts.intl.lang] - Language code for formatting values
 * @param {string} [opts.intl.datetime] - Date and time style for formatting datetime values
 * @param {string} [opts.intl.date] - Date style for formatting date values
 * @param {string} [opts.intl.time] - Time style for formatting time values
 * @param {string} [opts.intl.timeZone] - Time zone for formatting date/time values
 * @returns {Object} Returns sanitized record object
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
  const newRecord = await this.sanitizeBody({ body, partial: true, noDefault: true, allProps: true })
  if (record._ref) newRecord._ref = cloneDeep(record._ref)
  for (const key in newRecord) {
    const prop = this.getProperty(key)
    if (!prop) continue
    const val = ['object', 'array'].includes(prop.type) ? cloneDeep(newRecord[key]) : newRecord[key]
    if (isFunction(prop.getValue)) newRecord[key] = await prop.getValue.call(this, val, newRecord, opts)
    else if (isString(prop.getValue)) newRecord[key] = await callHandler(this.plugin, this, val, newRecord, opts)
  }
  if (opts.fmt) {
    newRecord._fmt = cloneDeep(newRecord)
    delete newRecord._fmt._ref
    const options = {
      lang: get(opts, 'intl.lang', get(opts, 'req.lang')),
      timeZone: get(opts, 'intl.timeZone', get(opts, 'req.site.setting.bajo.intl.timeZone')),
      emptyValue: get(opts, 'intl.emptyValue', get(opts, 'req.site.setting.bajo.intl.emptyValue')),
      unitSys: get(opts, 'intl.unitSys', get(opts, 'req.site.setting.bajo.intl.unitSys')),
      formatter: get(opts, 'intl.formatter', get(opts, 'req.site.setting.bajo.intl.formatter'))
    }

    for (const key in newRecord) {
      const prop = this.getProperty(key)
      if (!prop) continue
      let value = ['object', 'array'].includes(prop.type) ? cloneDeep(newRecord[key]) : newRecord[key]
      if (prop.values) {
        const values = await this.buildPropValues(prop, opts)
        if (isArray(value)) value = value.map(v => (values.find(opt => opt.value === v) ?? {}).text ?? v)
        else value = (values.find(v => v.value === value) ?? {}).text ?? value
      }
      if (prop.format === false) newRecord._fmt[key] = value + ''
      else if (isFunction(prop.format)) newRecord._fmt[key] = await prop.format.call(this, value, newRecord, opts)
      else if (isString(prop.format)) newRecord._fmt[key] = await callHandler(this.plugin, this, value, newRecord, opts)
      else {
        const _options = {
          ...options,
          field: key,
          latitude: ['lat', 'latitude'].includes(key),
          longitude: ['lon', 'lng', 'longitude'].includes(key)
        }
        newRecord._fmt[key] = format(value, prop.type, _options)
      }
    }
  }
  return newRecord
}

export default sanitizeRecord
