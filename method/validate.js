import joi from 'joi'

const excludedTypes = ['object', 'array']
const excludedNames = []

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
  } = this.lib._
  const obj = {}
  const { propType } = this.app.pluginFactory.dobo
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

async function validate (value, joiSchema, { ns, fields, extFields, params } = {}) {
  const { defaultsDeep, isSet } = this.lib.aneka
  const { isString, forOwn, find } = this.lib._

  ns = ns ?? [this.name]
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
