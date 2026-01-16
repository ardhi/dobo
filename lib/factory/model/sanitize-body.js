/**
 * Sanitize payload body against its model
 *
 * @method
 * @memberof Dobo
 * @async
 * @param {Object} [options={}]
 * @param {Object} [options.body={}]
 * @param {Object} [options.model={}]
 * @param {boolean} [options.partial=false]
 * @param {boolean} [options.strict=false]
 * @param {Array} [options.extFields=[]]
 * @returns {Object}
 */
async function sanitizeBody ({ body = {}, partial, strict, extFields = [], noDefault, truncateString, onlyTypes = [], action } = {}) {
  const { isSet } = this.app.lib.aneka
  const { callHandler } = this.app.bajo
  const { omit, has, isString, isNaN } = this.app.lib._
  const { sanitizeBoolean, sanitizeDate, sanitizeFloat, sanitizeInt, sanitizeObject, sanitizeString } = this.app.dobo
  const result = {}

  const sanitize = (name, type) => {
    if (onlyTypes.length > 0 && !onlyTypes.includes(type)) return
    if (['object', 'array'].includes(type)) result[name] = sanitizeObject(result[name])
    else if (type === 'boolean') result[name] = sanitizeBoolean(result[name])
    else if (['float', 'double'].includes(type)) result[name] = sanitizeFloat(result[name], strict)
    else if (['integer', 'smallint'].includes(type)) result[name] = sanitizeInt(result[name], strict)
    else if (['string', 'text'].includes(type)) result[name] = sanitizeString(result[name], strict)
    else if (['datetime'].includes(type)) result[name] = sanitizeDate(result[name], { input: 'native' })
    if (!strict && isNaN(result[name])) result[name] = null
    if (['updateRecord', 'upsertRecord'].includes(action) && type === 'string' && result[name] === '') result[name] = null
  }

  const omitted = []
  for (const prop of [...this.properties, ...extFields]) {
    if (partial && !has(body, prop.name)) continue
    result[prop.name] = body[prop.name]
    if (body[prop.name] === null) continue
    if (isSet(body[prop.name])) sanitize(prop.name, prop.type)
    else {
      if (isSet(prop.default) && !noDefault) {
        result[prop.name] = prop.default
        if (isString(prop.default) && prop.default.startsWith('handler:')) {
          const [, ...args] = prop.default.split(':')
          if (args.length > 0) result[prop.name] = await callHandler(args.join(':'))
        } else sanitize(prop.name, prop.type)
      }
    }
    if (truncateString && isSet(result[prop.name]) && ['string', 'text'].includes(prop.type)) result[prop.name] = result[prop.name].slice(0, prop.maxLength)
    if (prop.name.endsWith('Id') && prop.type === 'string' && ['smallint', 'integer'].includes(this.driver.idField.type)) result[prop.name] = result[prop.name] + ''
    if (body[prop.name] === undefined) omitted.push(prop.name)
  }
  return omit(result, omitted)
}

export default sanitizeBody
