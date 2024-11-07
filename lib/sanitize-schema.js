import genericPropSanitizer from './generic-prop-sanitizer.js'

async function sanitizeFeature (item) {
  const { get, isPlainObject, mergeWith, isArray } = this.app.bajo.lib._
  for (const f of item.feature) {
    const feature = get(this.feature, f.name) // source from collectFeature
    if (!feature) this.fatal('Unknown feature \'%s@%s\'', f.name, item.name)
    let [ns, path] = f.name.split('.')
    if (!path) ns = this.name
    const input = await feature.call(this.app[ns], f)
    let props = input.properties
    if (isPlainObject(props)) props = [props]
    if (props.length > 0) item.properties.push(...props)
    item.globalRules = item.globalRules ?? []
    if (input.globalRules) {
      item.globalRules = mergeWith(item.globalRules, input.globalRules, (oval, sval) => {
        if (isArray(oval)) return oval.concat(sval)
      })
    }
  }
}

async function sanitizeIndexes (item) {
  for (const idx of item.indexes) {
    if (!(typeof idx.fields === 'string' || Array.isArray(idx.fields))) this.fatal('Only accept array of field names or single string of field name \'%s@%s\'', 'indexes', item.name)
  }
}

async function sanitizeFullText (item) {
  for (const f of item.fullText.fields ?? []) {
    const prop = item.properties.find(p => p.name === f)
    if (!prop) this.fatal('Invalid field name \'%s@%s\'', f, item.name)
    // if (prop.type !== 'text') fatal.call(this, 'Fulltext index only available for field type \'text\' in \'%s@%s\'', f, item.name)
  }
}

async function sanitizeSchema (items) {
  const { freeze, fatal, importModule, defaultsDeep, join, breakNsPath, runHook } = this.app.bajo
  const { map, keys, findIndex, find, each, isString, get, isPlainObject, camelCase, uniq, filter } = this.app.bajo.lib._
  const properties = keys(this.propType)
  const schemas = []
  this.log.debug('Loading DB schemas')
  for (const k in items) {
    this.log.trace('- %s (%d)', k, keys(items[k]).length)
    for (const f in items[k]) {
      const item = items[k][f]
      await runHook(`dobo.${camelCase(item.name)}:beforeSanitizeSchema`, item)
      const conn = find(this.connections, { name: item.connection })
      if (!conn) fatal.call(this, 'Unknown connection \'%s@%s\'', item.name, item.connection)
      item.fullText = item.fullText ?? { fields: [] }
      item.indexes = item.indexes ?? []
      const { ns, path: type } = breakNsPath(conn.type)
      const driver = find(this.drivers, { type, ns, driver: conn.driver })
      if (driver.lowerCaseColl) item.name = item.name.toLowerCase()
      let file = `${ns}:/${this.name}/lib/${type}/prop-sanitizer.js`
      let propSanitizer = await importModule(file)
      if (!propSanitizer) propSanitizer = genericPropSanitizer
      for (const idx in item.properties) {
        let prop = item.properties[idx]
        if (isString(prop)) {
          let [name, type, maxLength, index, required] = prop.split(':')
          if (!type) type = 'string'
          maxLength = maxLength ?? 255
          prop = { name, type }
          if (type === 'string') prop.maxLength = parseInt(maxLength) || undefined
          if (index) prop.index = { type: index === 'true' ? 'default' : index }
          prop.required = required === 'true'
          item.properties[idx] = prop
        } else {
          if (isString(prop.index)) prop.index = { type: prop.index }
          else if (prop.index === true) prop.index = { type: 'default' }
        }
      }
      const idx = findIndex(item.properties, { name: 'id' })
      if (idx === -1) item.properties.unshift(driver.idField)
      item.feature = item.feature ?? []
      await sanitizeFeature.call(this, item)
      item.disabled = item.disabled ?? []
      if (item.disabled === 'all') item.disabled = ['find', 'get', 'create', 'update', 'remove']
      else if (item.disabled === 'readonly') item.disabled = ['create', 'update', 'remove']
      for (const idx in item.properties) {
        let prop = item.properties[idx]
        if (!prop.type) {
          prop.type = 'string'
          prop.maxLength = 255
        }
        if (!properties.includes(prop.type)) {
          let success = false
          const feature = get(this.feature, isPlainObject(prop.type) ? prop.type.name : prop.type)
          if (feature) {
            let opts = { fieldName: prop.name }
            if (isPlainObject(prop.type)) opts = defaultsDeep(opts, prop.type)
            else opts.name = prop.type
            const feat = find(item.feature, opts)
            if (!feat) item.feature.push(opts)
            const input = await feature.call(this, opts)
            if (input.properties && input.properties.length > 0) {
              prop = input.properties[0]
              success = true
            }
          }
          if (!success) fatal.call(this, 'Unsupported property type \'%s@%s\' in \'%s\'', prop.type, prop.name, item.name)
        }
        if (prop.index) {
          if (prop.index === 'unique') prop.index = { type: 'unique' }
          else if (prop.index === 'fulltext') prop.index = { type: 'fulltext' }
          else if (prop.index === 'primary') prop.index = { type: 'primary' }
          else if (prop.index === true) prop.index = { type: 'default' }
        }

        await propSanitizer.call(this, { prop, schema: item, connection: conn, driver })
        if (prop.index && prop.index.type === 'primary' && prop.name !== 'id') fatal.call(this, 'Primary index should only be used for \'id\' field')
        if (prop.index && prop.index.type === 'fulltext') {
          item.fullText.fields.push(prop.name)
          prop.index.type = 'default'
        }
        item.properties[idx] = prop
      }
      await sanitizeIndexes.call(this, item)
      await sanitizeFullText.call(this, item)
      const all = []
      each(item.properties, p => {
        if (!all.includes(p.name)) all.push(p.name)
        else fatal.call(this, 'Field \'%s@%s\' should be used only once', p.name, item.name)
      })
      file = `${ns}:/${this.name}/lib/${type}/schema-sanitizer.js`
      const schemaSanitizer = await importModule(file)
      if (schemaSanitizer) await schemaSanitizer.call(this, { schema: item, connection: conn, driver })
      schemas.push(item)
    }
  }
  for (const i in schemas) {
    const schema = schemas[i]
    const sortables = []
    const hidden = []
    for (const i2 in schema.properties) {
      const prop = schema.properties[i2]
      if (prop.type !== 'string') delete prop.maxLength
      if (prop.rel) {
        for (const key in prop.rel) {
          let def = prop.rel[key]
          if (isString(def)) {
            const [rschema, rfield] = def.split(':')
            def = { schema: rschema, propName: rfield }
          }
          def.type = def.type ?? 'one-to-one'
          const rel = find(schemas, { name: def.schema })
          if (!rel) {
            fatal.call(this, 'No schema found for relationship \'%s@%s:%s\'', `${def.schema}:${def.propName}`, schema.name, prop.name)
          }
          const rprop = find(rel.properties, { name: def.propName })
          if (!rprop) fatal.call(this, 'No property found for relationship \'%s@%s:%s\'', `${def.schema}:${def.propName}`, schema.name, prop.name)
          def.fields = def.fields ?? []
          if (['*', 'all'].includes(def.fields)) {
            const relschema = find(schemas, { name: def.schema })
            def.fields = relschema.properties.map(p => p.name)
          }
          if (def.fields.length > 0 && !def.fields.includes('id')) def.fields.push('id')
          for (const f of def.fields) {
            const p = find(rel.properties, { name: f })
            if (!p) fatal.call(this, 'Unknown property for field \'%s\' in relationship \'%s@%s:%s\'', p, `${def.schema}:${def.propName}`, schema.name, prop.name)
          }
          prop.type = rprop.type
          if (rprop.type === 'string') prop.maxLength = rprop.maxLength
          else {
            delete prop.maxLength
            delete prop.minLength
          }
          prop.rel[key] = def
        }
        // TODO: propSanitizer must be called again
      }
      if (prop.hidden) hidden.push(prop.name)
      if (prop.index) sortables.push(prop.name)
      delete prop.hidden
      schema.properties[i2] = prop
    }
    // sortables
    each(schema.indexes, item => {
      sortables.push(...item.fields)
    })
    // hidden
    schema.hidden = uniq(filter((schema.hidden ?? []).concat(hidden), item => map(schema.properties, 'name').includes(item)))
    schema.sortables = sortables
    await runHook(`dobo.${camelCase(schema.name)}:afterSanitizeSchema`, schema)
  }
  this.schemas = schemas
  freeze(this.schemas)
  this.log.debug('Loaded schemas: %s', join(map(this.schemas, 'name')))
}

export default sanitizeSchema
