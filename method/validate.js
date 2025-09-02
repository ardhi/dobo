import joi from 'joi'

const excludedTypes = ['object', 'array']
const excludedNames = []

/**
 * @typedef {string[]} TValidatorString
 * @property {string} 0=alphanum
 * @property {string} 1=base64
 * @property {string} 2=case
 * @property {string} 3=creditCard
 * @property {string} 4=dataUri
 * @property {string} 5=email
 * @property {string} 6=guid
 * @property {string} 7=uuid
 * @property {string} 8=hex
 * @property {string} 9=hostname
 * @property {string} 10=insenstive
 * @property {string} 11=ip
 * @property {string} 12=isoDate
 * @property {string} 13=isoDuration
 * @property {string} 14=length
 * @property {string} 15=lowercase
 * @property {string} 16=max
 * @property {string} 17=min
 * @property {string} 18=normalize
 * @property {string} 19=pattern
 * @property {string} 20=regex
 * @property {string} 21=replace
 * @property {string} 22=token
 * @property {string} 23=trim
 * @property {string} 24=truncate
 * @property {string} 25=upercase
 * @property {string} 26=uri
 */

/**
 * @typedef {string[]} TValidatorNumber
 * @property {string} 0=great
 * @property {string} 1=less
 * @property {string} 2=max
 * @property {string} 3=min
 * @property {string} 4=multiple
 * @property {string} 5=negative
 * @property {string} 6=port
 * @property {string} 7=positive
 * @property {string} 8=sign
 * @property {string} 9=unsafe
 */

/**
 * @typedef {string[]} TValidatorBoolean
 * @property {string} 0=falsy
 * @property {string} 1=sensitive
 * @property {string} 2=truthy
 */

/**
 * @typedef {string[]} TValidatorDate
 * @property {string} 0=greater
 * @property {string} 1=iso
 * @property {string} 2=less
 * @property {string} 2=max
 * @property {string} 2=min
 */

/**
 * @typedef {string[]} TValidatorTimestamp
 * @property {string} 0=timestamp
 */

/**
 * @typedef {Object} TValidator
 * @property {TValidatorString} string
 * @property {TValidatorNumber} number
 * @property {TValidatorBoolean} boolean
 * @property {TValidatorDate} date
 * @property {TValidatorTimestamp} timestamp
 */
const validator = {
  string: ['alphanum', 'base64', 'case', 'creditCard', 'dataUri', 'domain', 'email', 'guid',
    'uuid', 'hex', 'hostname', 'insensitive', 'ip', 'isoDate', 'isoDuration', 'length', 'lowercase',
    'max', 'min', 'normalize', 'pattern', 'regex', 'replace', 'token', 'trim', 'truncate',
    'uppercase', 'uri'],
  number: ['great', 'less', 'max', 'min', 'multiple', 'negative', 'port', 'positive',
    'sign', 'unsafe'],
  boolean: ['falsy', 'sensitive', 'truthy'],
  date: ['greater', 'iso', 'less', 'max', 'min'],
  timestamp: ['timestamp']
}

function buildFromDbSchema (schema, { fields = [], rule = {}, extFields = [] } = {}) {
  // if (schema.validation) return schema.validation
  const {
    isPlainObject, get, each, isEmpty, isString, forOwn, keys,
    find, isArray, has, cloneDeep, concat, without
  } = this.app.lib._
  const obj = {}
  const { propType } = this.app.pluginClass.dobo
  const refs = []

  function getRuleKv (kvRule) {
    let key
    let value
    let columns
    if (isPlainObject(kvRule)) {
      key = kvRule.rule
      value = kvRule.params
      columns = kvRule.fields
    } else if (isString(kvRule)) {
      [key, value, columns] = kvRule.split(':')
    }
    return { key, value, columns }
  }

  function applyFieldRules (prop, obj) {
    const minMax = { min: false, max: false }
    const rules = get(rule, prop.name, prop.rules ?? [])
    if (!isArray(rules)) return rules
    each(rules, r => {
      const types = validator[propType[prop.type].validator]
      const { key, value } = getRuleKv(r)
      if (keys(minMax).includes(key)) minMax[key] = true
      if (key === 'ref') {
        refs.push(prop.name)
        obj = joi.ref(value)
        return undefined
      }
      if (!key || !types.includes(key)) return undefined
      obj = obj[key](value)
    })
    if (refs.includes(prop.name)) return obj
    if (['string', 'text'].includes(prop.type)) {
      forOwn(minMax, (v, k) => {
        if (v) return undefined
        if (has(prop, `${k}Length`)) obj = obj[k](prop[`${k}Length`])
      })
    }
    if (isArray(prop.values)) obj = obj.valid(...prop.values)
    if (!['id'].includes(prop.name) && prop.required) obj = obj.required()
    return obj
  }

  const props = concat(cloneDeep(schema.properties), extFields)

  for (const p of props) {
    if (excludedTypes.includes(p.type) || excludedNames.includes(p.name)) continue
    if (fields.length > 0 && !fields.includes(p.name)) continue
    let item
    switch (p.type) {
      case 'text':
      case 'string': {
        item = applyFieldRules(p, joi.string())
        break
      }
      case 'smallint':
      case 'integer':
        item = applyFieldRules(p, joi.number().integer())
        break
      case 'float':
      case 'double':
        if (p.precision) item = applyFieldRules(p, joi.number().precision(p.precision))
        else item = applyFieldRules(p, joi.number())
        break
      case 'time':
      case 'date':
      case 'datetime':
        item = applyFieldRules(p, joi.date())
        break
      case 'timestamp':
        item = applyFieldRules(p, joi.number().integer())
        break
      case 'boolean':
        item = applyFieldRules(p, joi.boolean())
        break
    }
    if (item) {
      if (item.$_root) obj[p.name] = item.allow(null)
      else obj[p.name] = item
    }
  }
  if (isEmpty(obj)) return false
  each(get(schema, 'globalRules', []), r => {
    each(without(keys(obj), ...refs), k => {
      const prop = find(props, { name: k })
      if (!prop) return undefined
      const types = validator[propType[prop.type].validator]
      const { key, value, columns = [] } = getRuleKv(r)
      if (!types.includes(key)) return undefined
      if (columns.length === 0 || columns.includes(k)) obj[k] = obj[k][key](value)
    })
  })
  const result = joi.object(obj)
  if (fields.length === 0) return result
  each(['with', 'xor', 'without'], k => {
    const item = get(schema, `extRule.${k}`)
    if (item) result[k](...item)
  })
  return result
}

/**
 * Validate value against JOI schema
 *
 * @method
 * @memberof Dobo
 * @async
 * @param {Object} value - value to validate
 * @param {Object} joiSchema - JOI schema
 * @param {Object} [options={}] - Options object
 * @param {string} [options.ns=dobo] - Scope's namespace
 * @param {Array} [options.fields=[]]
 * @param {Array} [options.extFields=[]]
 * @param {Object} [options.params={}] - Validation parameters. See {@tutorial config} and {@link https://joi.dev/api/?v=17.13.3#anyvalidateasyncvalue-options|JOI validate's options}
 * @returns {Object}
 */
async function validate (value, joiSchema, { ns, fields, extFields, params } = {}) {
  const { defaultsDeep, isSet } = this.app.lib.aneka
  const { isString, forOwn, find } = this.app.lib._

  ns = ns ?? [this.ns]
  params = defaultsDeep(params, this.config.validationParams)
  const { rule = {} } = params
  delete params.rule
  if (isString(joiSchema)) {
    const { schema } = this.getInfo(joiSchema)
    forOwn(value, (v, k) => {
      if (!isSet(v)) return undefined
      const p = find(schema.properties, { name: k })
      if (!p) return undefined
      for (const t of ['date|YYYY-MM-DD', 'time|HH:mm:ss']) {
        const [type, input] = t.split('|')
        if (p.type === type) value[k] = this.sanitizeDate(value[k], { input, output: 'native' })
      }
    })
    joiSchema = buildFromDbSchema.call(this, schema, { fields, rule, extFields })
  }
  if (!joiSchema) return value
  try {
    return await joiSchema.validateAsync(value, params)
  } catch (err) {
    throw this.error('validationError', { details: err.details, values: err.values, ns, statusCode: 422, code: 'DB_VALIDATION' })
  }
}

export default validate
