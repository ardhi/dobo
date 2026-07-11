import path from 'path'
import adapterFactory from './factory/adapter.js'
import connectionFactory from './factory/connection.js'
import featureFactory from './factory/feature.js'
import modelFactory from './factory/model.js'
import actionFactory from './factory/action.js'

/**
 * @module Helper
 */

/**
 * Sanitizes a property definition for a model, ensuring it adheres to the expected structure and types.
 * It handles various property attributes such as type, index, required status, and more.
 *
 * If the property is virtual, it processes it accordingly; otherwise, it adds it to the model's properties
 * and indexes.
 * @param {DoboModel} model
 * @param {DoboModel.TProperty} prop
 * @param {DoboModel.TIndex[]} indexes
 */
async function sanitizeProp (model, prop, indexes) {
  const { isEmpty, isString, keys, pick, isArray, isPlainObject, omit, isFunction } = this.app.lib._
  const allPropKeys = this.getAllPropertyKeys(model.connection.adapter)
  const propType = this.constructor.propertyType
  if (isString(prop)) {
    let [name, type, maxLength, idx, required] = prop.split(',').map(m => m.trim())
    if (isEmpty(type)) type = 'string'
    maxLength = isEmpty(maxLength) ? propType.string.maxLength : parseInt(maxLength)
    prop = { name, type, maxLength }
    if (!isEmpty(idx)) prop.index = idx
    prop.required = required === 'true'
  }
  prop.type = prop.type ?? 'string'
  if (isArray(prop.values)) {
    prop.values = prop.values.map(item => {
      if (isPlainObject(item)) return pick(item, ['value', 'text'])
      return { value: item, text: item }
    })
  } else if (!(isString(prop.values) || isFunction(prop.values))) delete prop.values
  if (prop.hidden) model.hidden.push(prop.name)
  if (prop.scanable) model.scanables.push(prop.scanable)
  if (prop.virtual) {
    const keys = Object.keys(propType)
    if (!keys.includes(prop.type)) this.fatal('unknownPropType%s%s', `${prop.name}:${prop.type}`, model.name)
    for (const key of ['required', 'rules', 'index', 'validator', 'ref', 'rulesMsg', 'immutable']) {
      delete prop[key]
    }
    model.properties.push(prop)
  } else {
    if (prop.index) {
      if (prop.index === true || prop.index === 'true') prop.index = 'index'
      const [idx, idxName] = prop.index.split(':')
      const index = { name: idxName ?? `${model.collName}_${prop.name}_${idx}`, fields: [prop.name], type: idx }
      indexes.push(index)
    }
    if (keys(propType).includes(prop.type)) model.properties.push(pick(prop, allPropKeys))
    else {
      const feature = this.getFeature(prop.type)
      if (!feature) this.fatal('unknownPropType%s%s', prop.type, model.name)
      const opts = omit(prop, ['name', 'type'])
      opts.field = prop.name
      await applyFeature.call(this, model, feature, opts, indexes)
    }
  }
}

/**
 * Finds and sanitizes all properties for a given model schema, ensuring that the 'id' property is included and
 * that all properties are properly processed.
 * @param {object} schema - The model schema
 * @param {array} inputs - The list of input properties to process
 * @param {array} indexes - The list of indexes to update
 */
async function findAllProps (schema, inputs = [], indexes = []) {
  const { isPlainObject, cloneDeep } = this.app.lib._
  const isIdProp = inputs.find(p => {
    return isPlainObject(p) ? p.name === 'id' : p.startsWith('id,')
  })
  if (!isIdProp) {
    const idField = cloneDeep(schema.connection.adapter.idField)
    idField.name = 'id'
    inputs.unshift(idField)
  }
  for (const prop of inputs) {
    await sanitizeProp.call(this, schema, prop, indexes)
  }
}

/**
 * Applies a feature to a model schema, adding properties, rules, hooks, and other
 * configurations as defined by the feature.
 * @param {object} schema - The model schema
 * @param {object} feature - The feature to apply
 * @param {object} options - The options for the feature
 * @param {array} indexes - The list of indexes to update
 */
async function applyFeature (schema, feature, options, indexes) {
  const { isArray, findIndex } = this.app.lib._
  if (feature.name === 'dobo:unique' && options.field === 'id') {
    const idx = findIndex(schema.properties, { name: 'id' })
    if (idx > -1) schema.properties.pullAt(idx)
  }
  const item = await feature.handler(options)
  if (item.rules) schema.rules.push(...item.rules)
  if (item.scanables) schema.scanables.push(...item.scanables)
  if (!isArray(item.properties)) item.properties = [item.properties]
  for (const prop of item.properties) {
    prop.feature = `${feature.plugin.ns}:${feature.name}`
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
 * Finds and applies all features for a given model schema, ensuring that each feature is properly processed
 * @param {object} schema - The model schema
 * @param {array} inputs - The list of features to apply
 * @param {array} indexes - The list of indexes to update
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
 * Finds and applies all indexes for a given model schema, ensuring that each index is properly processed
 * @param {object} schema - The model schema
 * @param {array} inputs - The list of indexes to apply
 * @param {array} indexes - The list of existing indexes to update
 */
async function findAllIndexes (schema, inputs = [], indexes = []) {
  const items = []
  for (const index of inputs) {
    index.type = index.type ?? 'index'
    index.fields = index.fields ?? []
    if (!index.name) index.name = `${schema.name}_${index.fields.join('_')}_${index.type}`
    items.push(index)
  }
  schema.indexes = [...items, ...indexes]
}

/**
 * Sanitizes the references in a model schema, ensuring that all references point to valid models and properties.
 * It checks for duplicate reference keys and validates the existence of referenced models and properties.
 * @async
 * @param {object} schema - The model schema to sanitize
 * @param {object[]} schemas - The list of all model schemas
 * @returns {Promise<void>}
 */
export async function sanitizeRef (schema, schemas) {
  const { find, isString, pullAt } = this.app.lib._
  const _refKeys = []
  for (const prop of schema.properties) {
    const ignored = []
    for (const key in prop.ref ?? {}) {
      _refKeys.push(key)
      let ref = prop.ref[key]
      if (isString(ref)) {
        ref = { field: ref }
      }
      ref.field = ref.field ?? 'id'
      ref.type = ref.type ?? '1:1'
      ref.searchField = ref.searchField ?? ref.field
      ref.labelField = ref.labelField ?? ref.searchField
      const rModel = find(schemas, { name: ref.model })
      if (!rModel) {
        ignored.push(key)
        this.log.warn('notFound%s%s', this.t('model'), ref.model)
        continue
      }
      const rProp = find(rModel.properties, { name: ref.field })
      if (!rProp) {
        ignored.push(key)
        this.log.warn('notFound%s%s', this.t('property'), `${ref.field}@${ref.model}`)
        continue
      }
      ref.fields = ref.fields ?? '*'
      if (['*', 'all'].includes(ref.fields)) ref.fields = rModel.properties.map(p => p.name)
      if (ref.fields.length > 0 && !ref.fields.includes('id')) ref.fields.unshift('id')
      const removed = []
      for (const idx in ref.fields) {
        const p = find(rModel.properties, { name: ref.fields[idx] })
        if (!p) removed.push(ref.fields[idx])
      }
      pullAt(ref.fields, removed)
      prop.ref[key] = ref
    }
    for (const key of ignored) {
      delete prop.ref[key]
    }
  }
  const dupes = _refKeys.filter((item, index) => _refKeys.indexOf(item) !== index)
  if (dupes.length > 0) throw this.error('duplicateRefKeys%s%s', schema.name, dupes.join(', '))
}

/**
 * Sanitizes all model schemas, ensuring that properties, indexes, and references are properly defined and validated.
 * It also determines the sortable fields based on the defined indexes.
 * @async
 * @param {object} schema - The model schema
 * @returns {Promise<void>}
 */
export async function sanitizeAll (schema) {
  const { runHook } = this.app.bajo
  const { pick, keys, map, uniq, camelCase, filter } = this.app.lib._
  const { defaultsDeep } = this.app.lib.aneka
  const allPropNames = uniq(map(schema.properties, 'name'))
  const propType = this.constructor.propertyType
  const indexTypes = this.constructor.indexTypes

  await runHook(`dobo.${camelCase(schema.name)}:beforeSanitizeModel`, schema)
  // properties
  for (const idx in schema.properties) {
    let prop = schema.properties[idx]
    const def = propType[prop.type]
    prop = pick(defaultsDeep(prop, def), this.getPropertyKeysByType(prop.type))
    if (!keys(propType).includes(prop.type)) this.fatal('unknownPropType%s%s', `${prop.name}.${def.name}`, prop.type)
    if (prop.type === 'string') {
      prop.minLength = parseInt(prop.minLength) ?? 0
      prop.maxLength = parseInt(prop.maxLength) ?? 255
      if (prop.minLength > 0) prop.required = true
      if (prop.minLength === 0) delete prop.minLength
    }
    schema.properties[idx] = prop
  }
  // indexes
  for (const index of schema.indexes) {
    if (!indexTypes.includes(index.type)) this.fatal('unknownIndexType%s%s', index.type, schema.name)
    for (const field of index.fields) {
      if (!allPropNames.includes(field)) this.fatal('unknownPropNameOnIndex%s%s', field, schema.name)
    }
  }
  await runHook(`dobo.${camelCase(schema.name)}:afterSanitizeModel`, schema)
  // sorting only possible using these fields
  schema.sortables = []
  for (const index of schema.indexes) {
    schema.sortables.push(...index.fields)
  }
  schema.hidden = filter(uniq(schema.hidden), prop => allPropNames.includes(prop))
}

/**
 * Creates a model schema by sanitizing its properties, features, and indexes, and ensuring that all references are valid.
 * It also applies any buildStart and buildEnd handlers defined in the schema.
 * @param {object} item - The model definition object
 * @returns {object} - The sanitized model schema
 */
async function createSchema (item) {
  const { find, orderBy, get } = this.app.lib._
  const { mergeObjectsByKey, defaultsDeep, parseObject } = this.app.lib.aneka
  const feats = item.features ?? []
  const props = item.properties ?? []
  const indexes = item.indexes ?? []
  item.features = []
  item.properties = []
  item.indexes = []
  item.hidden = item.hidden ?? []
  item.rules = item.rules ?? []
  item.buildLevel = item.buildLevel ?? 999
  item.hooks = item.hooks ?? []
  item.disabled = item.disabled ?? []
  item.scanables = item.scanables ?? []
  if (item.disabled === 'all') item.disabled = ['find', 'get', 'create', 'update', 'remove']
  else if (item.disabled === 'readonly') item.disabled = ['create', 'update', 'remove']
  const conn = item.connection ?? 'default'
  if (!(conn instanceof this.app.baseClass.DoboConnection)) {
    item.connection = null
    // Is there any overwritten connection?
    const newConn = find(this.connections, c => c.options.models.includes(item.name))
    if (newConn) item.connection = newConn
    else {
      item.connection = this.getConnection(conn, true)
      if (!item.connection && conn === 'default') item.connection = this.getConnection('memory')
    }
    if (!item.connection) this.fatal('unknownConn%s%s', conn, item.name)
  }
  // cache settings
  const defCache = defaultsDeep({}, item.connection.options.cache, get(this, 'app.bajoCache.config.default', this.config.default.cache))
  if (item.cache === false) item.cache = { ttlDur: 0 }
  else if (item.cache === true) item.cache = defCache
  else item.cache = defaultsDeep({}, item.cache, defCache)
  item.cache = parseObject(item.cache)
  if (item.connection.name === 'memory') item.cache.ttlDur = 0

  // let's run
  await findAllProps.call(this, item, props, indexes)
  await findAllFeats.call(this, item, feats, indexes)
  await findAllIndexes.call(this, item, indexes)
  for (const key of ['properties', 'indexes']) {
    item[key] = mergeObjectsByKey(item[key], 'name')
  }
  item.hooks = orderBy(item.hooks, ['name', 'level'])
  delete item.features
  await sanitizeAll.call(this, item)
  return item
}

/**
 * Collects all model schemas from the application, sanitizes them, and creates model instances.
 * It also handles any buildStart and buildEnd handlers defined in the model definitions.
 * @async
 * @method
 * @returns {Promise<void>}
 */
export async function collectModels () {
  const { eachPlugins, callHandler } = this.app.bajo
  const { orderBy, has, omit } = this.app.lib._
  await actionFactory.call(this)
  await modelFactory.call(this)

  this.log.trace('collecting%s', this.t('model'))
  const me = this
  let schemas = []
  await eachPlugins(async function ({ file }) {
    const { readConfig, callHandler } = this.app.bajo
    const { pascalCase } = this.app.lib.aneka
    const { isPlainObject, isEmpty, isArray } = this.app.lib._

    let items = await readConfig(file, { ns: this.ns, baseNs: me.ns, merge: true })
    if (isEmpty(items)) return undefined
    if (isPlainObject(items)) {
      items.baseName = items.baseName ?? path.basename(file, path.extname(file))
      items.name = items.name ?? pascalCase(`${this.alias} ${items.baseName}`)
    }
    if (!isArray(items)) items = [items]
    for (const item of items) {
      if (!item.baseName) me.fatal('missing%s%s', 'baseName', file)
      item.name = item.name ?? pascalCase(`${this.alias} ${item.baseName}`)
      me.log.trace('- %s', item.name)
      item.collName = item.collName ?? item.name
      item.options = item.options ?? {}
      item.options.attachment = item.options.attachment ?? true
      item.options.persistence = item.options.persistence ?? true
      item.ns = this.ns
      if (item.buildStart) await callHandler(this, item.buildStart, item)
      const schema = await createSchema.call(me, item)
      schemas.push(schema)
    }
  }, { glob: ['model/*.*', 'model.*'], prefix: this.ns })
  schemas = orderBy(schemas, ['buildLevel', 'name'])
  for (const schema of schemas) {
    const idProp = schema.properties.find(p => p.name === 'id')
    if (!this.constructor.idTypes.includes(idProp.type)) this.fatal('invalidIdType%s%s', schema.name, this.constructor.idTypes.join(', '))
    if (idProp.type === 'string' && !has(idProp, 'maxLength')) idProp.maxLength = 50
    const plugin = this.app[schema.ns]
    await sanitizeRef.call(this, schema, schemas)
    for (const item of schema.indexes) {
      for (const field of item.fields) {
        const prop = schema.properties.find(p => p.name === field)
        if (!prop || (prop && prop.virtual)) throw this.error('virtualFieldIn%s%s%s', field, 'index', schema.name)
      }
    }
    for (const field of schema.scanables) {
      const prop = schema.properties.find(p => p.name === field)
      if (!prop || (prop && prop.virtual)) throw this.error('virtualFieldIn%s%s%s', field, 'scanable', schema.name)
    }
    const model = new this.app.baseClass.DoboModel(plugin, omit(schema, ['beforeCreate', 'afterCreate']))
    me.models.push(model)
    if (schema.buildEnd) await callHandler(plugin, schema.buildEnd, model)
  }
  schemas = []
  this.log.debug('collected%s%d', this.t('model'), this.models.length)
}

/**
 * Collects all model features from loaded plugins
 * @async
 * @method
 * @returns {Promise<void>}
 */
export async function collectFeatures () {
  const { eachPlugins } = this.app.bajo
  await featureFactory.call(this)

  this.log.trace('collecting%s', this.t('feature'))
  const me = this
  await eachPlugins(async function ({ file }) {
    const { importModule } = this.app.bajo
    const { camelCase, isFunction } = this.app.lib._

    const name = camelCase(path.basename(file, '.js'))
    const handler = await importModule(file)
    if (!isFunction(handler)) this.fatal('invalidFeatureHandler%s%s', this.ns, name)
    me.features.push(new this.app.baseClass.DoboFeature(this, { name, handler }))
    me.log.trace('- %s:%s', this.ns, name)
  }, { glob: 'feature/*.js', prefix: this.ns })
  this.log.debug('collected%s%d', this.t('feature'), this.features.length)
}

/**
 * Collects all database connections from loaded plugins, initializes their adapters, and ensures that a default connection is available.
 * It also handles any memory-based connections and merges their models into a single memory connection.
 * @async
 * @method
 * @returns {Promise<void>}
 */
export async function collectConnections () {
  const { buildCollections } = this.app.bajo
  const { pullAt } = this.app.lib._
  const { filterIndex } = this.app.lib.aneka
  await connectionFactory.call(this)

  async function handler ({ item }) {
    const { has } = this.app.lib._
    if (!has(item, 'adapter')) this.fatal('unknownDbAdapter%s')
    const conn = new this.app.baseClass.DoboConnection(this, item)
    await conn.initAdapter(item.adapter)
    return conn
  }
  const memIndexes = filterIndex(this.config.connections, current => current.adapter === 'dobo:memory' || current.name === 'memory')
  const models = memIndexes.map(idx => [...(this.config.connections[idx].models ?? [])])
  pullAt(this.config.connections, memIndexes)
  this.config.connections.push({
    adapter: 'dobo:memory',
    name: 'memory',
    models
  })
  this.connections = await buildCollections({ ns: this.ns, container: 'connections', handler, dupChecks: ['name'] })
  const defConn = this.connections.find(conn => conn.name === 'default')
  if (!defConn) this.log.warn('noDefaultConnection')
}

/**
 * Collects all database adapters from loaded plugins.
 * @async
 * @method
 * @returns {Promise<void>}
 */
export async function collectAdapters () {
  const { eachPlugins, runHook } = this.app.bajo
  const { importModule } = this.app.bajo
  const { camelCase, isFunction } = this.app.lib._
  await adapterFactory.call(this)

  this.log.trace('collecting%s', this.t('adapter'))
  const me = this
  await runHook(`${this.ns}:beforeCollectAdapters`)
  await eachPlugins(async function ({ file }) {
    const name = camelCase(path.basename(file, '.js'))
    const factory = await importModule(file)
    if (!isFunction(factory)) this.fatal('invalidAdapterClassFactory%s%s', this.ns, name)
    const Cls = await factory.call(this)
    const instance = new Cls(this, name)
    if (!(instance instanceof this.app.baseClass.DoboAdapter)) this.fatal('invalidAdapterClass%s%s', this.ns, name)
    me.adapters.push(instance)
    me.log.trace('- %s:%s', this.ns, name)
  }, { glob: 'adapter/*.js', prefix: this.ns })
  await runHook(`${this.ns}:afterCollectAdapters`)
  this.log.debug('collected%s%d', this.t('adapter'), this.adapters.length)
}
