/**
 * Sanitize payload body against schema
 *
 * @method
 * @memberof Dobo
 * @async
 * @param {Object} [options={}]
 * @param {Object} [options.body={}]
 * @param {Object} [options.schema={}]
 * @param {boolean} [options.partial=false]
 * @param {boolean} [options.strict=false]
 * @param {Array} [options.extFields=[]]
 * @returns {Object}
 */

async function sanitizeBody ({ body = {}, schema = {}, partial, strict, extFields = [] }) {
  const { isSet } = this.app.lib.aneka
  const { dayjs } = this.app.lib
  const { callHandler } = this.app.bajo
  const { has, isString, isNumber, concat, isNaN } = this.app.lib._
  const result = {}
  for (const p of concat(schema.properties, extFields)) {
    if (partial && !has(body, p.name)) continue
    if (['object', 'array'].includes(p.type)) {
      if (isString(body[p.name])) {
        try {
          result[p.name] = JSON.parse(body[p.name])
        } catch (err) {
          result[p.name] = null
        }
      } else {
        try {
          result[p.name] = JSON.parse(JSON.stringify(body[p.name]))
        } catch (err) {}
      }
    } else result[p.name] = body[p.name]
    if (isSet(body[p.name])) {
      if (p.type === 'boolean') result[p.name] = result[p.name] === null ? null : (['true', true].includes(result[p.name]))
      if (['float', 'double'].includes(p.type)) {
        if (isNumber(body[p.name])) result[p.name] = body[p.name]
        else if (strict) {
          result[p.name] = Number(body[p.name])
        } else {
          result[p.name] = parseFloat(body[p.name]) || null
        }
      }
      if (['integer', 'smallint'].includes(p.type)) {
        if (isNumber(body[p.name])) result[p.name] = body[p.name]
        else if (strict) {
          result[p.name] = Number(body[p.name])
        } else {
          result[p.name] = parseInt(body[p.name]) || null
        }
      }
      if (p.type === 'timestamp') {
        if (!isNumber(body[p.name])) result[p.name] = -1
        else {
          const dt = dayjs.unix(body[p.name])
          result[p.name] = dt.isValid() ? dt.unix() : -1
        }
      } else {
        for (const t of ['datetime', 'date|YYYY-MM-DD', 'time|HH:mm:ss']) {
          const [type, input] = t.split('|')
          if (p.type === type) result[p.name] = this.sanitizeDate(body[p.name], { input })
        }
      }
      if (['string', 'text'].includes(p.type)) result[p.name] = body[p.name] + ''
    } else {
      if (isSet(p.default)) {
        result[p.name] = p.default
        if (isString(p.default) && p.default.startsWith('handler:')) {
          const [, ...args] = p.default.split(':')
          if (args.length > 0) result[p.name] = await callHandler(args.join(':'))
        } else {
          if (['float', 'double'].includes(p.type)) result[p.name] = parseFloat(result[p.name])
          if (['integer', 'smallint'].includes(p.type)) result[p.name] = parseInt(result[p.name])
          if (isNaN(result[p.name])) result[p.name] = null
        }
      }
    }
  }
  return result
}

export default sanitizeBody
