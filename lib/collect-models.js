import path from 'path'

/**
 * Sanitize one single property of a model
 *
 * @param {Object} model - Loaded model
 * @param {Object} prop - Property to check
 * @param {Array} [indexes] - Container array to fill up found index
 */
async function sanitizeProp (model, prop, indexes) {
  const { map, isEmpty, isString, keys, pick } = this.app.lib._
  const allPropKeys = this.getAllPropertyKeys(model.connection.driver)
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
    const index = { name: idxName ?? `${model.collName}_${prop.name}_${idx}`, fields: [prop.name], type: idx }
    indexes.push(index)
  }
  if (prop.hidden) model.hidden.push(prop.name)
  if (!keys(propType).includes(prop.type)) {
    const feature = this.getFeature(prop.type)
    if (!feature) this.fatal('unknownPropType%s%s', prop.type, model.name)
    const items = await applyFeature.call(this, model, prop.type)
    model.properties.push(...map(items, i => pick(i, allPropKeys)))
  } else model.properties.push(pick(prop, allPropKeys))
}

/**
 * Collect all properties it can be found on model
 *
 * @param {Object} model - Model
 * @param {Array} [inputs] - Array of properties
 * @param {Array} [indexes] - Container array to fill up found index
 */
async function findAllProps (model, inputs = [], indexes = [], isExtender) {
  const { isPlainObject, cloneDeep } = this.app.lib._
  const isIdProp = inputs.find(p => {
    return isPlainObject(p) ? p.name === 'id' : p.startsWith('id,')
  })
  if (!isExtender && !isIdProp) {
    const idField = cloneDeep(model.connection.driver.idField)
    idField.name = 'id'
    inputs.unshift(idField)
  }
  for (const prop of inputs) {
    await sanitizeProp.call(this, model, prop, indexes)
  }
}

/**
 * Apply each feature found
 * @param {Object} model - Model
 * @param {Object} feature - Feature to apply
 * @param {Object} options - Options to the feature
 * @returns {Array} New properties found in feature
 */
async function applyFeature (model, feature, options, indexes) {
  const { isArray } = this.app.lib._
  const item = await feature.handler(options)
  if (item.rules) model.rules.push(...item.rules)
  if (!isArray(item.properties)) item.properties = [item.properties]
  for (const prop of item.properties) {
    await sanitizeProp.call(this, model, prop, indexes)
  }
  if (item.hooks) {
    item.hooks = item.hooks.map(hook => {
      hook.level = hook.level ?? 999
      return hook
    })
    model.hooks.push(...item.hooks)
  }
}

/**
 * Collect all features it can be found on model
 *
 * @param {Object} model - Model
 * @param {Array} [inputs] - Array of properties
 */
async function findAllFeats (model, inputs = [], indexes = []) {
  const { isString, omit } = this.app.lib._
  for (let feat of inputs) {
    if (isString(feat)) feat = { name: feat }
    const featName = feat.name.indexOf(':') === -1 ? `dobo:${feat.name}` : feat.name
    const feature = this.app.dobo.getFeature(featName)
    if (!feature) this.fatal('invalidFeature%s%s', model.name, featName)
    await applyFeature.call(this, model, feature, omit(feat, 'name'), indexes)
  }
}

/**
 * Collect all indexes it can be found on model
 *
 * @param {Object} model - Model
 * @param {Array} [inputs] - Array of properties
 */
async function findAllIndexes (model, inputs = []) {
  const indexes = []
  for (const index of inputs) {
    index.fields = index.fields ?? []
    if (!index.name) index.name = `${model.name}_${index.fields.join('_')}_${index.type}`
    indexes.push(index)
  }
  model.indexes = indexes
}

/**
 * Sanitize any reference/relationship found in properties
 *
 * @param {Object} model - Model
 * @param {Array} [models] - All model match agaist. Defaults to ```dobo.models```
 */
export async function sanitizeRef (model, models, fatal) {
  const { find, isString, pullAt } = this.app.lib
  if (!models) models = this.models
  for (const prop of model.properties) {
    const ignored = []
    for (const rModelName in prop.ref ?? {}) {
      let ref = prop.ref[rModelName]
      if (isString(ref)) {
        ref = { propName: ref }
      }
      ref.type = ref.type ?? '1:1'
      const rModel = find(models, { name: rModelName })
      if (!rModel) {
        if (fatal) this.fatal(this, 'unknownModelForRef%s%s%s', rModelName, model.name, prop.name)
        else ignored.push(rModelName)
      }
      const rProp = find(rModel.properties, { name: ref.propName })
      if (!rProp) {
        if (fatal) this.fatal('unknownPropForRef%s%s%s%s', rModelName, ref.propName, model.name, prop.name)
        else ignored.push(rModelName)
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
      prop.ref[rModelName] = ref
    }
    for (const key of ignored) {
      delete prop.ref[key]
    }
  }
}

/**
 * Sanitize all but reference, because a reference needs all models to be available first
 *
 * @param {Object} model - Model
 */
export async function sanitizeAll (model) {
  const { runHook } = this.app.bajo
  const { pick, keys, map, uniq, camelCase, filter } = this.app.lib._
  const { defaultsDeep } = this.app.lib.aneka
  const allPropNames = uniq(map(model.properties, 'name'))
  const propType = this.constructor.propertyType
  const indexTypes = this.constructor.indexTypes

  await runHook(`dobo.${camelCase(model.name)}:beforeSanitizeModel`, model)
  // properties
  for (let prop of model.properties) {
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
  for (const index of model.indexes) {
    if (!indexTypes.includes(index.type)) this.fatal('unknownIndexType%s%s', index.type, model.name)
    for (const field of index.fields) {
      if (!allPropNames.includes(field)) this.fatal('unknownPropNameOnIndex%s%s', field, model.name)
    }
  }
  // sortables
  model.sortables = []
  for (const index of model.indexes) {
    model.sortables.push(...index.fields)
  }
  model.hidden = filter(uniq(model.hidden), prop => allPropNames.includes(prop))
  await runHook(`dobo.${camelCase(model.name)}:afterSanitizeModel`, model)
}

/**
 * Create schema for model
 *
 * @param {Object} item - Source item
 * @returns {Object} Sanitized model
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
  const newConn = find(this.connections, c => c.options.models.includes(item.name))
  if (newConn) item.connection = newConn
  else {
    item.connection = this.getConnection(conn, true)
    if (!item.connection && conn === 'default') item.connection = this.getConnection('memory')
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
        if (!isPlainObject(extender)) this.plugin.fatal('invalidModelExtender%s%s', ns, item.name)
        await findAllProps.call(this, item, extender.properties ?? [], indexes, true)
        await findAllFeats.call(this, item, extender.features ?? [], indexes, true)
        await findAllIndexes.call(this, item, extender.indexes ?? [], true)
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
  const { orderBy, has } = this.app.lib._

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
    if (!isPlainObject(item)) me.fatal('invalidModel%s', defName)
    item.name = item.name ?? defName
    item.collName = item.collName ?? item.name
    item.file = file
    const schema = await createSchema.call(me, item)
    schema.ns = this.ns
    schemas.push(item)
  }, { glob: 'model/*.*', prefix: this.ns })
  schemas = orderBy(schemas, ['buildLevel', 'name'])
  for (const schema of schemas) {
    const plugin = this.app[schema.ns]
    delete schema.ns
    await sanitizeRef.call(this, schema, schemas, true)
    const idProp = schema.properties.find(p => p.name === 'id')
    if (!this.constructor.idTypes.includes(idProp.type)) this.fatal('invalidIdType%s%s', schema.name, this.constructor.idTypes.join(', '))
    if (idProp.type === 'string' && !has(idProp, 'maxLength')) idProp.maxLength = 50
    const model = new me.baseClass.Model(plugin, schema)
    me.models.push(model)
    me.log.trace('- %s', model.name)
  }
  this.log.debug('collected%s%d', this.t('model'), this.models.length)
}

export default collectModels
