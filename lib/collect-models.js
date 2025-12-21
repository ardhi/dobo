import modelFactory from './factory/model.js'
import path from 'path'

/**
 * Sanitize one single property of a schema
 *
 * @param {Object} schema - Loaded schema
 * @param {Object} prop - Property to check
 * @param {Array} [indexes] - Container array to fill up found index
 */
async function sanitizeProp (schema, prop, indexes) {
  const { map, isEmpty, isString, snakeCase, keys, pick } = this.app.lib._
  const allPropKeys = this.getAllPropertyKeys()
  const propType = this.constructor.propertyType
  if (isString(prop)) {
    let [name, type, maxLength, idx, required] = prop.split(',').map(m => m.trim())
    if (isEmpty(type)) type = 'string'
    maxLength = isEmpty(maxLength) ? propType.string.maxLength : parseInt(maxLength)
    prop = { name, type, maxLength }
    prop.index = isEmpty(idx) ? undefined : idx
    prop.required = required === 'true'
  }
  if (prop.index) {
    if (prop.index === true || prop.index === 'true') prop.index = 'index'
    const [idx, idxName] = prop.index.split(':')
    const index = { name: idxName ?? `${snakeCase(schema.name)}_${snakeCase(prop.name).replaceAll('_', '')}_${idx}`, fields: [prop.name], type: idx }
    indexes.push(index)
  }
  if (prop.hidden) schema.hidden.push(prop.name)
  if (!keys(propType).includes(prop.type)) {
    const feature = this.getFeature(prop.type)
    if (!feature) this.fatal('unknownPropType%s%s', prop.type, schema.name)
    const items = await applyFeature.call(this, schema, prop.type)
    schema.properties.push(...map(items, i => pick(i, allPropKeys)))
  } else schema.properties.push(pick(prop, allPropKeys))
}

/**
 * Collect all properties it can be found on schema
 *
 * @param {Object} schema - Schema
 * @param {Array} [inputs] - Array of properties
 * @param {Array} [indexes] - Container array to fill up found index
 */
async function findAllProps (schema, inputs = [], indexes = []) {
  for (const prop of inputs) {
    await sanitizeProp.call(this, schema, prop, indexes)
  }
}

/**
 * Apply each feature found
 * @param {Object} schema - Schema
 * @param {Object} feature - Feature to apply
 * @param {Object} options - Options to the feature
 * @returns {Array} New properties found in feature
 */
async function applyFeature (schema, feature, options, indexes) {
  const { isArray } = this.app.lib._
  const item = await feature.handler(options)
  if (item.rules) schema.rules.push(...item.rules)
  if (!isArray(item.properties)) item.properties = [item.properties]
  for (const prop of item.properties) {
    await sanitizeProp.call(this, schema, prop, indexes)
  }
  if (item.hooks) {
    item.hooks = item.hooks.map(hook => {
      hook.level = hook.level ?? 999
      return hook
    })
    schema.hooks.push(...item.hooks)
  }
}

/**
 * Collect all features it can be found on schema
 *
 * @param {Object} schema - Schema
 * @param {Array} [inputs] - Array of properties
 */
async function findAllFeats (schema, inputs = [], indexes = []) {
  const { isString, omit } = this.app.lib._
  for (let feat of inputs) {
    if (isString(feat)) feat = { name: feat }
    const featName = feat.name.indexOf(':') === -1 ? `dobo:${feat.name}` : feat.name
    const feature = this.app.dobo.getFeature(featName)
    if (!feature) this.fatal('invalidFeature%s%s', schema.name, featName)
    await applyFeature.call(this, schema, feature, omit(feat, 'name'), indexes)
  }
}

/**
 * Collect all indexes it can be found on schema
 *
 * @param {Object} schema - Schema
 * @param {Array} [inputs] - Array of properties
 */
async function findAllIndexes (schema, inputs = []) {
  const indexes = []
  for (const index of inputs) {
    index.fields = index.fields ?? []
    if (!index.name) index.name = `${schema.name}_${index.fields.join('_')}_${index.type}`
    indexes.push(index)
  }
  schema.indexes = indexes
}

/**
 * Sanitize any reference/relationship found in properties
 *
 * @param {Object} schema - Schema
 * @param {Array} [models] - All schema match agaist. Defaults to ```dobo.models```
 */
export async function sanitizeRef (schema, models, fatal) {
  const { find, isString, pullAt } = this.app.lib
  if (!models) models = this.models
  for (const prop of schema.properties) {
    const ignored = []
    for (const rSchemaName in prop.ref ?? {}) {
      let ref = prop.ref[rSchemaName]
      if (isString(ref)) {
        ref = { propName: ref }
      }
      ref.type = ref.type ?? '1:1'
      const rSchema = find(models, { name: rSchemaName })
      if (!rSchema) {
        if (fatal) this.fatal(this, 'unknownSchemaForRef%s%s%s', rSchemaName, schema.name, prop.name)
        else ignored.push(rSchemaName)
      }
      const rProp = find(rSchema.properties, { name: ref.propName })
      if (!rProp) {
        if (fatal) this.fatal('unknownPropForRef%s%s%s%s', rSchemaName, ref.propName, schema.name, prop.name)
        else ignored.push(rSchemaName)
      }
      ref.fields = ref.fields ?? '*'
      if (['*', 'all'].includes(ref.fields)) ref.fields = rSchema.properties.map(p => p.name)
      if (ref.fields.length > 0 && !ref.fields.includes('id')) ref.fields.unshift('id')
      const removed = []
      for (const idx in ref.fields) {
        const p = find(rSchema.properties, { name: ref.fields[idx] })
        if (!p) removed.push(ref.fields[idx])
      }
      pullAt(ref.fields, removed)
      prop.ref[rSchemaName] = ref
    }
    for (const key of ignored) {
      delete prop.ref[key]
    }
  }
}

/**
 * Sanitize all but reference, because a reference needs all models to be available first
 *
 * @param {Object} schema - Schema
 */
export async function sanitizeAll (schema) {
  const { runHook } = this.app.bajo
  const { pick, keys, map, uniq, camelCase, filter } = this.app.lib._
  const { defaultsDeep } = this.app.lib.aneka
  const allPropNames = uniq(map(schema.properties, 'name'))
  const propType = this.constructor.propertyType
  const indexTypes = this.constructor.indexTypes

  await runHook(`dobo.${camelCase(schema.name)}:beforeSanitizeSchema`, schema)
  // properties
  for (let prop of schema.properties) {
    const def = propType[prop.type]
    prop = pick(defaultsDeep(prop, def), this.getPropertyKeysByType(prop.type))
    if (!keys(propType).includes(prop.type)) this.fatal('unknownPropType%s%s', `${prop.name}.${def.name}`, prop.type)
    if (prop.type === 'string') {
      prop.minLength = parseInt(prop.minLength) ?? 0
      prop.maxLength = parseInt(prop.maxLength) ?? 255
      if (prop.minLength > 0) prop.required = true
    }
  }
  // indexes
  for (const index of schema.indexes) {
    if (!indexTypes.includes(index.type)) this.fatal('unknownIndexType%s%s', index.type, schema.name)
    for (const field of index.fields) {
      if (!allPropNames.includes(field)) this.fatal('unknownPropNameOnIndex%s%s', field, schema.name)
    }
  }
  // sortables
  schema.sortables = []
  for (const index of schema.indexes) {
    schema.sortables.push(...index.fields)
  }
  schema.hidden = filter(uniq(schema.hidden), prop => allPropNames.includes(prop))
  await runHook(`dobo.${camelCase(schema.name)}:afterSanitizeSchema`, schema)
}

/**
 * Create schema
 *
 * @param {Object} item - Source item
 * @returns {Object} Sanitized schema
 */
async function createSchema (item) {
  const { readConfig } = this.app.bajo
  const { fastGlob } = this.app.lib
  const { find, isPlainObject, orderBy } = this.app.lib._
  const { mergeObjectsByKey } = this.app.lib.aneka
  if (item.file && !item.base) item.base = path.basename(item.file, path.extname(item.file))
  item.attachment = item.attachment ?? true
  const feats = item.features ?? []
  const props = item.properties ?? []
  const indexes = item.indexes ?? []
  item.features = []
  item.properties = []
  item.indexes = []
  item.hidden = item.hidden ?? []
  item.rules = item.rules ?? []
  item.buildLevel = item.buildLevel ?? 999
  const conn = item.connection ?? 'default'
  item.connection = null
  item.hooks = item.hooks ?? []
  item.disabled = item.disabled ?? []
  if (item.disabled === 'all') item.disabled = ['find', 'get', 'create', 'update', 'remove']
  else if (item.disabled === 'readonly') item.disabled = ['create', 'update', 'remove']
  // Is there any overwritten connection?
  const newConn = find(this.connections, c => c.models.includes(item.name))
  if (newConn) item.connection = newConn
  else {
    item.connection = this.getConnection(conn)
  }
  if (!item.connection) this.fatal('unknownConn%s%s', conn, item.name)
  await findAllProps.call(this, item, props, indexes)
  await findAllFeats.call(this, item, feats, indexes)
  await findAllIndexes.call(this, item, indexes)
  // item extender
  if (item.base) {
    for (const ns of this.app.getAllNs()) {
      const plugin = this.app[ns]
      const glob = `${plugin.dir.pkg}/extend/dobo/extend/${item.ns}/item/${item.base}.*`
      const files = await fastGlob(glob)
      for (const file of files) {
        const extender = await readConfig(file, { ns: plugin.ns, ignoreError: true })
        if (!isPlainObject(extender)) this.plugin.fatal('invalidSchemaExtender%s%s', ns, item.name)
        await findAllProps.call(this, item, extender.properties ?? [], indexes)
        await findAllFeats.call(this, item, extender.features ?? [], indexes)
        await findAllIndexes.call(this, item, extender.indexes ?? [])
      }
    }
  }
  for (const key of ['properties', 'indexes']) {
    item[key] = mergeObjectsByKey(item[key], 'name')
  }
  item.hooks = orderBy(item.hooks, ['name', 'level'])
  delete item.features
  delete item.base
  await sanitizeAll.call(this, item)
  return item
}

/**
 * Collect all models from loaded plugins and create the models
 *
 * @name collectModels
 * @memberof module:lib
 * @async
 * @see Dobo#init
 */
async function collectModels () {
  const { eachPlugins } = this.app.bajo
  const { orderBy } = this.app.lib._
  const Model = await modelFactory.call(this)

  this.log.trace('collecting%s', this.t('model'))
  const me = this
  let schemas = []
  await eachPlugins(async function ({ file }) {
    const { readConfig } = this.app.bajo
    const { pascalCase } = this.app.lib.aneka
    const { isPlainObject } = this.app.lib._

    const base = path.basename(file, path.extname(file))
    const defName = pascalCase(`${this.alias} ${base}`)
    const item = await readConfig(file, { ns: this.ns, ignoreError: true })
    if (!isPlainObject(item)) me.fatal('invalidSchema%s', defName)
    item.name = item.name ?? defName
    item.file = file
    const schema = await createSchema.call(me, item)
    schema.ns = this.ns
    schemas.push(item)
  }, { glob: 'schema/*.*', prefix: this.ns })
  schemas = orderBy(schemas, ['buildLevel', 'name'])
  for (const schema of schemas) {
    const plugin = this.app[schema.ns]
    delete schema.ns
    await sanitizeRef.call(this, schema, schemas, true)
    await schema.connection.driver.sanitizeModelSchema(schema)
    const model = new Model(plugin, schema)
    await model.driver.sanitizeIdField(model)
    me.models.push(model)
    me.log.trace('- %s', schema.name)
  }
  this.log.debug('collected%s%d', this.t('model'), this.models.length)
}

export default collectModels
