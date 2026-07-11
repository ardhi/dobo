import joi from 'joi'

const excludedTypes = ['object']
const excludedNames = []

/**
 * List of available string validators to check against model's properties and rules
 * @typedef {string[]} TValidatorString
 * @memberof DoboModel
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
 * List of available number validators to check against model's properties and rules
 * @typedef {string[]} TValidatorNumber
 * @memberof DoboModel
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
 * List of available boolean validators to check against model's properties and rules
 * @typedef {string[]} TValidatorBoolean
 * @memberof DoboModel
 * @property {string} 0=falsy
 * @property {string} 1=sensitive
 * @property {string} 2=truthy
 */

/**
 * List of available date validators to check against model's properties and rules
 * @typedef {string[]} TValidatorDate
 * @memberof DoboModel
 * @property {string} 0=greater
 * @property {string} 1=iso
 * @property {string} 2=less
 * @property {string} 3=max
 * @property {string} 4=min
 */

/**
 * List of available timestamp validators to check against model's properties and rules
 * @typedef {string[]} TValidatorTimestamp
 * @memberof DoboModel
 * @property {string} 0=timestamp
 */

/**
 * All available validators to check against model's properties and rules
 * @typedef {Object} TValidator
 * @memberof DoboModel
 * @property {TValidatorString} string
 * @property {TValidatorNumber} number
 * @property {TValidatorBoolean} boolean
 * @property {TValidatorDate} date
 * @property {TValidatorTimestamp} timestamp
 * @property {TValidatorArray} array
 */

/**
 * List of available array validators to check against model's properties and rules
 * @typedef {string[]} TValidatorArray
 * @memberof DoboModel
 * @property {string} 0=length
 * @property {string} 1=max
 * @property {string} 2=min
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
  timestamp: ['timestamp'],
  array: ['length', 'max', 'min']
}

/**
 * Build JOI model from database model's properties and rules
 * @method
 * @memberof DoboModel
 * @async
 * @param {object} [options={}] - Options object
 * @param {Array} [options.fields=[]] - If not empty, only these fields will be included in the JOI model
 * @param {object} [options.rule={}] - Custom rules to override model's rules
 * @param {Array} [options.extFields=[]] - Additional fields to include in the JOI model
 * @param {boolean} [options.partial=false] - If `true`, only the fields present in the body will be validated
 * @returns {object|boolean} Returns JOI model object or `false` if no properties to validate
 */
async function buildFromDbModel (options = {}) {
  const { isPlainObject, get, isEmpty, isString, keys, find, has, without } = this.app.lib._
  const { fields = [], rule = {}, extFields = [] } = options
  const obj = {}
  const { propertyType: propType } = this.app.baseClass.Dobo
  const refs = []
  const me = this

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

  async function applyFieldRules (prop, obj) {
    const minMax = { min: false, max: false }
    const rules = get(rule, prop.name, prop.rules ?? [])
    if (!Array.isArray(rules)) return rules
    for (const r of rules) {
      const types = validator[propType[prop.type].validator]
      const { key, value } = getRuleKv(r)
      if (keys(minMax).includes(key)) minMax[key] = true
      if (key === 'ref') {
        refs.push(prop.name)
        obj = joi.ref(value)
        continue
      }
      if (!key || !types.includes(key)) continue
      obj = obj[key](value)
    }
    if (refs.includes(prop.name)) return obj
    if (['string', 'text'].includes(prop.type)) {
      for (const k in minMax) {
        if (minMax[k]) continue
        if (has(prop, `${k}Length`)) obj = obj[k](prop[`${k}Length`])
      }
    }
    if (!['id'].includes(prop.name) && prop.required) obj = obj.required()
    if (prop.values) {
      const values = await me.buildPropValues(prop, options)
      const items = values.map(item => item.value)
      if (prop.type === 'array') {
        obj = obj.items(joi.string().valid(...items))
      } else obj = obj.valid(...items)
    }
    if (prop.rulesMsg) {
      const msgs = {}
      for (const k in prop.rulesMsg) {
        msgs[k] = '~' + prop.rulesMsg[k] // note: to tell bajo error formatter that this is a custom error message
      }
      obj = obj.messages(msgs)
    }
    return obj
  }

  const props = [...this.properties, ...extFields]
  for (const p of props) {
    if (excludedTypes.includes(p.type) || excludedNames.includes(p.name)) continue
    if (options.partial && fields.length > 0 && !fields.includes(p.name)) continue
    let item
    switch (p.type) {
      case 'text':
      case 'string': {
        item = await applyFieldRules(p, joi.string())
        break
      }
      case 'smallint':
      case 'integer':
        item = await applyFieldRules(p, joi.number().integer())
        break
      case 'float':
      case 'double':
        if (p.precision) item = await applyFieldRules(p, joi.number().precision(p.precision))
        else item = await applyFieldRules(p, joi.number())
        break
      case 'time':
      case 'date':
      case 'datetime':
        item = await applyFieldRules(p, joi.date())
        break
      case 'timestamp':
        item = await applyFieldRules(p, joi.number().integer())
        break
      case 'boolean':
        item = await applyFieldRules(p, joi.boolean())
        break
      case 'array':
        item = await applyFieldRules(p, joi.array())
        break
    }
    if (item) {
      if (item.$_root && !p.required) obj[p.name] = item.allow(null, '')
      else obj[p.name] = item
    }
  }
  if (isEmpty(obj)) return false
  for (const r of this.rules) {
    for (const k of without(keys(obj), ...refs)) {
      const prop = find(props, { name: k })
      if (!prop) continue
      const types = validator[propType[prop.type].validator]
      const { key, value, columns = [] } = getRuleKv(r)
      if (!types.includes(key)) continue
      if (columns.length === 0 || columns.includes(k)) obj[k] = obj[k][key](value)
    }
  }
  const result = joi.object(obj)
  for (const k of ['with', 'xor', 'without']) {
    const item = get(this, `extRule.${k}`)
    if (item) result[k](...item)
  }
  return result
}

/**
 * Validate body object against JOI model
 *
 * @method
 * @memberof DoboModel
 * @async
 * @param {Object} body - Body object to validate
 * @param {Object} joiModel - JOI model
 * @param {Object} [options={}] - Options object
 * @param {Array} [options.extFields=[]]
 * @param {boolean} [options.partial=false] - If `true`, only the fields present in the body will be validated
 * @param {Object} [options.params={}] - Validation parameters. See {@tutorial config} and {@link https://joi.dev/api/?v=17.13.3#anyvalidateasyncvalue-options|JOI validate's options}
 * @returns {Object}
 */
async function validate (body, joiModel, options = {}) {
  const { defaultsDeep } = this.app.lib.aneka
  const { isEmpty } = this.app.lib._
  let { extFields = [], params = {}, partial } = options
  params = defaultsDeep(params, this.app.dobo.config.validationParams)
  const { rule = {} } = params
  delete params.rule
  const fields = partial ? Object.keys(body) : [...options.fields]
  if (isEmpty(joiModel)) joiModel = await buildFromDbModel.call(this, { fields, rule, extFields, partial })
  if (!joiModel) return { value: body }
  try {
    return await joiModel.validateAsync(body, params)
  } catch (err) {
    const payload = { details: err.details, statusCode: 422, code: 'DB_VALIDATION', model: this.name }
    if (err.values) payload.values = err.values
    throw this.plugin.error('validationError', payload)
  }
}

export default validate
