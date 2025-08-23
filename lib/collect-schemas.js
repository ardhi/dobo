import path from 'path'
import sanitizeSchema from './sanitize-schema.js'

async function handler ({ file }) {
  const { name: ns, alias } = this
  const { readConfig, eachPlugins } = this.app.bajo
  const { pascalCase } = this.lib.aneka
  const { get, isPlainObject, each, find, has, isArray, forOwn, isString, merge } = this.lib._
  const { fastGlob } = this.lib

  const base = path.basename(file, path.extname(file))
  const defName = pascalCase(`${alias} ${base}`)
  const mod = await readConfig(file, { ns, ignoreError: true })
  if (!isPlainObject(mod)) this.fatal('invalidSchema%s', defName)
  const forcedConn = get(this, `app.${ns}.config.dobo.schemaConnection.${base}`)
  if (forcedConn) mod.connection = forcedConn
  if (!mod.connection) mod.connection = 'default'
  mod.name = mod.name ?? defName
  mod.file = file
  mod.ns = ns
  mod.attachment = mod.attachment ?? true
  mod.feature = mod.feature ?? []
  mod.buildLevel = mod.buildLevel ?? 999
  const feats = []
  if (isArray(mod.feature)) {
    each(mod.feature, f => {
      if (isString(f)) feats.push({ name: f })
      else if (isPlainObject(f)) feats.push(f)
    })
  } else if (isPlainObject(mod.feature)) {
    forOwn(mod.feature, (v, k) => {
      feats.push(merge({}, v, { name: k }))
    })
  }
  mod.feature = feats
  mod.properties = mod.properties ?? []
  // if ((mod.properties ?? []).length === 0) this.fatal('noPropsFoundOnSchema%s', mod.name)
  // schema extender
  await eachPlugins(async function ({ dir }) {
    const { name: ns } = this
    const glob = `${dir}/extend/dobo/extend/${mod.ns}/schema/${base}.*`
    const files = await fastGlob(glob)
    for (const file of files) {
      const extender = await readConfig(file, { ns, ignoreError: true })
      if (!isPlainObject(extender)) return undefined
      each(extender.properties ?? [], p => {
        if (isString(p) && mod.properties.includes(p)) return undefined
        else if (find(mod.properties, { name: p.name })) return undefined
        mod.properties.push(p)
      })
      const feats = []
      if (isArray(extender.feature)) {
        each(extender.feature, f => {
          if (isString(f)) feats.push({ name: f })
          else if (isPlainObject(f)) feats.push(f)
        })
      } else if (isPlainObject(extender.feature)) {
        forOwn(extender.feature, (v, k) => {
          feats.push(merge({}, v, { name: k }))
        })
      }
      if (feats.length > 0) mod.feature.push(...feats)
      if (ns === this.app.bajo.mainNs) {
        each(['connection', 'name'], i => {
          if (has(extender, i)) mod[i] = extender[i]
        })
      }
      mod.extender = mod.extender ?? []
      mod.extender.push(ns)
    }
  })
  return mod
}

async function collectSchemas () {
  const { eachPlugins } = this.app.bajo
  const { isEmpty } = this.lib._
  const result = await eachPlugins(handler, { glob: 'schema/*.*', prefix: this.name })
  if (isEmpty(result)) this.log.warn('notFound%s', this.print.write('schema'))
  else await sanitizeSchema.call(this, result)
}

export default collectSchemas
