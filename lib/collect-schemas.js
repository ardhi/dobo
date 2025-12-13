import schemaFactory from './factory/schema.js'
import path from 'path'

/**
 * Sanitize one single property of schema definition object
 *
 * @param {Object} def - Schema definition object
 * @param {Object} prop - Property to check
 * @param {Array} [indexes] - Container array to fill up found index
 */
async function sanitizeProp (def, prop, indexes) {
  const { map, isEmpty, isString, snakeCase, keys, pick } = this.app.lib._
  const allPropKeys = this.getAllPropKeys()
  const propType = this.constructor.propType
  if (isString(prop)) {
    let [name, type, maxLength, idx, required] = prop.split(',').map(m => m.trim())
    if (isEmpty(type)) type = 'string'
    if (isEmpty(maxLength)) maxLength = propType.string.maxLength
    prop = { name, type, maxLength }
    prop.index = isEmpty(idx) ? undefined : idx
    prop.required = required === 'true'
  }
  if (prop.index) {
    if (prop.index === true || prop.index === 'true') prop.index = 'index'
    const [idx, idxName] = prop.index.split(':')
    const index = { name: idxName ?? `${snakeCase(def.name)}_${snakeCase(prop.name).replaceAll('_', '')}_${idx}`, fields: [prop.name], type: idx }
    indexes.push(index)
  }
  if (prop.hidden) def.hidden.push(prop.name)
  if (!keys(propType).includes(prop.type)) {
    const feature = this.getFeature(prop.type)
    if (!feature) this.fatal('unknownPropType%s%s', prop.type, def.name)
    const items = await applyFeature.call(this, def, prop.type)
    def.properties.push(...map(items, i => pick(i, allPropKeys)))
  } else def.properties.push(pick(prop, allPropKeys))
}

/**
 * Collect all properties it can be found on schema defintion object
 *
 * @param {Object} def - Schema definition object
 * @param {Array} [inputs] - Array of properties
 * @param {Array} [indexes] - Container array to fill up found index
 */
async function findAllProps (def, inputs = [], indexes = []) {
  for (const prop of inputs) {
    await sanitizeProp.call(this, def, prop, indexes)
  }
}

/**
 * Apply each feature found
 * @param {*} def - Schema definition object
 * @param {*} feature - Feature to apply
 * @param {*} options - Options to the feature
 * @returns {Array} New properties found in feature
 */
async function applyFeature (def, feature, options, indexes) {
  const { merge, isArray } = this.app.lib._
  const item = await feature.handler(options)
  if (item.rules) def.rules.push(...item.rules)
  def.hook = merge(def.hook, item.hook ?? {})
  if (!isArray(item.properties)) item.properties = [item.properties]
  for (const prop of item.properties) {
    await sanitizeProp.call(this, def, prop, indexes)
  }
}

/**
 * Collect all features it can be found on schema defintion object
 *
 * @param {Object} def - Schema definition object
 * @param {Array} [inputs] - Array of properties
 */
async function findAllFeats (def, inputs = [], indexes = []) {
  const { isString, omit } = this.app.lib._
  for (let feat of inputs) {
    if (isString(feat)) feat = { name: feat }
    const featName = feat.name.indexOf(':') === -1 ? `dobo:${feat.name}` : feat.name
    const feature = this.app.dobo.getFeature(featName)
    if (!feature) this.fatal('invalidFeature%s%s', def.name, featName)
    await applyFeature.call(this, def, feature, omit(feat, 'name'), indexes)
  }
}

/**
 * Collect all indexes it can be found on schema defintion object
 *
 * @param {Object} def - Schema definition object
 * @param {Array} [inputs] - Array of properties
 */
async function findAllIndexes (def, inputs = []) {
  const indexes = []
  for (const index of inputs) {
    index.fields = index.fields ?? []
    if (!index.name) index.name = `${def.name}_${index.fields.join('_')}_${index.type}`
    indexes.push(index)
  }
  def.indexes = indexes
}

/**
 * Sanitize any reference/relationship found in properties
 *
 * @param {Object} def - Schema definition object
 * @param {Array} [schemas] - All schema def object to match agaist. Defaults to ```dobo.schemas```
 */
export async function sanitizeRef (def, schemas, fatal) {
  const { find, isString, pullAt } = this.app.lib
  if (!schemas) schemas = this.schemas
  for (const prop of def.properties) {
    const ignored = []
    for (const refSchema in prop.ref ?? {}) {
      let ref = prop.rel[refSchema]
      if (isString(ref)) {
        ref = { propName: ref }
      }
      ref.type = ref.type ?? 'one-to-one'
      const schema = find(schemas, { name: refSchema })
      if (!schema) {
        if (fatal) this.fatal(this, 'unknownSchemaForRef%s%s%s', refSchema, def.name, prop.name)
        else ignored.push(refSchema)
      }
      const rprop = find(schema.properties, { name: ref.propName })
      if (!rprop) {
        if (fatal) this.fatal('unknownPropForRef%s%s%s%s', refSchema, ref.propName, def.name, prop.name)
        else ignored.push(refSchema)
      }
      ref.fields = ref.fields ?? '*'
      if (['*', 'all'].includes(ref.fields)) schema.properties.map(p => p.name)
      if (ref.fields.length > 0 && !ref.fields.includes('id')) ref.fields.unshift('id')
      const removed = []
      for (const idx in ref.fields) {
        const p = find(schema.properties, { name: ref.fields[idx] })
        if (!p) removed.push(ref.fields[idx])
      }
      pullAt(ref.fields, removed)
      prop.ref[refSchema] = ref
    }
  }
}

/**
 * Sanitize all but reference, because a reference needs all schemas to be available first
 *
 * @param {Object} def - Schema definition object
 */
export async function sanitizeAll (def) {
  const { runHook } = this.app.bajo
  const { pick, keys, map, uniq, camelCase, filter } = this.app.lib._
  const { defaultsDeep } = this.app.lib.aneka
  const allPropNames = uniq(map(def.properties, 'name'))
  const propType = this.constructor.propType
  const indexTypes = this.constructor.indexTypes

  await runHook(`dobo.${camelCase(def.name)}:beforeSanitizeSchema`, def)
  // properties
  for (let prop of def.properties) {
    const def = propType[prop.type]
    prop = pick(defaultsDeep(prop, def), this.getPropKeys(prop.type))
    if (!keys(propType).includes(prop.type)) this.fatal('unknownPropType%s%s', `${prop.name}.${def.name}`, prop.type)
    if (prop.type === 'string') {
      prop.minLength = parseInt(prop.minLength) ?? 0
      prop.maxLength = parseInt(prop.maxLength) ?? 255
      if (prop.minLength > 0) prop.required = true
    }
  }
  // indexes
  for (const index of def.indexes) {
    if (!indexTypes.includes(index.type)) this.fatal('unknownIndexType%s%s', index.type, def.name)
    for (const field of index.fields) {
      if (!allPropNames.includes(field)) this.fatal('unknownPropNameOnIndex%s%s', field, def.name)
    }
  }
  // sortables
  def.sortables = []
  for (const index of def.indexes) {
    def.sortables.push(...index.fields)
  }
  def.hidden = filter(uniq(def.hidden), prop => allPropNames.includes(prop))
  await runHook(`dobo.${camelCase(def.name)}:afterSanitizeSchema`, def)
}

/**
 * Create sanitized schema definition object
 *
 * @param {Object} def - Schema definition object
 * @returns {Object} Sanitized schema definition object
 */
async function createSchemaDef (def) {
  const { readConfig } = this.app.bajo
  const { fastGlob } = this.app.lib
  const { find, isPlainObject } = this.app.lib._
  const { mergeObjectsByKey } = this.app.lib.aneka

  if (def.file && !def.base) def.base = path.basename(def.file, path.extname(def.file))
  def.attachment = def.attachment ?? true
  const feats = def.features ?? []
  const props = def.properties ?? []
  const indexes = def.indexes ?? []
  def.features = []
  def.properties = []
  def.indexes = []
  def.hidden = def.hidden ?? []
  def.rules = def.rules ?? []
  def.buildLevel = def.buildLevel ?? 999
  const conn = def.connection ?? 'default'
  def.connection = null
  def.hook = def.hook ?? {}
  def.disabled = def.disabled ?? []
  def.cacheable = def.cacheable ?? true
  if (def.disabled === 'all') def.disabled = ['find', 'get', 'create', 'update', 'remove']
  else if (def.disabled === 'readonly') def.disabled = ['create', 'update', 'remove']
  // Is there any overwritten connection?
  const newConn = find(this.connections, c => c.schemas.includes(def.name))
  if (newConn) def.connection = newConn
  else {
    def.connection = this.getConnection(conn)
  }
  if (!def.connection) this.fatal('unknownConn%s%s', conn, def.name)
  await findAllProps.call(this, def, props, indexes)
  await findAllFeats.call(this, def, feats, indexes)
  await findAllIndexes.call(this, def, indexes)
  // schema extender
  if (def.base) {
    for (const ns of this.app.findAllNs()) {
      const plugin = this.app[ns]
      const glob = `${plugin.dir.pkg}/extend/dobo/extend/${def.ns}/schema/${def.base}.*`
      const files = await fastGlob(glob)
      for (const file of files) {
        const extender = await readConfig(file, { ns: plugin.ns, ignoreError: true })
        if (!isPlainObject(extender)) this.plugin.fatal('invalidSchemaExtender%s%s', ns, def.name)
        await findAllProps.call(this, def, extender.properties ?? [], indexes)
        await findAllFeats.call(this, def, extender.features ?? [], indexes)
        await findAllIndexes.call(this, def, extender.indexes ?? [])
      }
    }
  }
  for (const key of ['properties', 'indexes']) {
    def[key] = mergeObjectsByKey(def[key], 'name')
  }
  delete def.features
  delete def.base
  await sanitizeAll.call(this, def)
  return def
}

/**
 * Collect all database schemas from loaded plugins
 *
 * @name collectSchemas
 * @memberof module:lib
 * @async
 * @see Dobo#init
 */
async function collectSchemas () {
  const { eachPlugins } = this.app.bajo
  const { orderBy } = this.app.lib._
  const Schema = await schemaFactory.call(this)

  this.log.trace('collecting%s', this.t('schema'))
  const me = this
  let defs = []
  await eachPlugins(async function ({ file }) {
    const { readConfig } = this.app.bajo
    const { pascalCase } = this.app.lib.aneka
    const { isPlainObject } = this.app.lib._

    const base = path.basename(file, path.extname(file))
    const defName = pascalCase(`${this.alias} ${base}`)
    const mod = await readConfig(file, { ns: this.ns, ignoreError: true })
    if (!isPlainObject(mod)) me.fatal('invalidSchema%s', defName)
    mod.name = mod.name ?? defName
    const def = await createSchemaDef.call(me, mod)
    def.ns = this.ns
    defs.push(def)
  }, { glob: 'schema/*.*', prefix: this.ns })
  defs = orderBy(defs, ['buildLevel', 'name'])
  for (const def of defs) {
    await sanitizeRef.call(this, def, defs, true)
    const plugin = this.app[def.ns]
    delete def.ns
    const schema = new Schema(plugin, def)
    await schema.driver.sanitizeSchema(schema)
    me.schemas.push(schema)
    me.log.trace('- %s', def.name)
  }
  this.log.debug('collected%s%d', this.t('schema'), this.schemas.length)
}

export default collectSchemas
