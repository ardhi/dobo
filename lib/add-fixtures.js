import path from 'path'

async function addFixture (name, { spinner } = {}) {
  const { resolvePath, readConfig, eachPlugins, getPluginDataDir } = this.app.bajo
  const { isEmpty, isArray } = this.app.bajo.lib._
  const { schema, connection } = this.getInfo(name)
  if (connection.proxy) {
    this.log.warn('\'%s\' is bound to a proxied connection, skipped!', schema.name)
    return
  }
  const result = { success: 0, failed: 0 }
  const base = path.basename(schema.file, path.extname(schema.file))
  // original
  const pattern = resolvePath(`${path.dirname(schema.file)}/../fixture/${base}.*`)
  let items = await readConfig(pattern, { ns: schema.ns, ignoreError: true })
  if (isEmpty(items)) items = []
  // override
  const overrides = await readConfig(`${getPluginDataDir(this.name)}/override/fixture/${schema.name}.*`, { ns: this.name, ignoreError: true })
  if (isArray(overrides) && !isEmpty(overrides)) items = overrides
  // extend
  const me = this
  await eachPlugins(async function ({ dir, ns }) {
    const extend = await readConfig(`${dir}/${me.name}/extend/fixture/${schema.name}.*`, { ns, ignoreError: true })
    if (isArray(extend) && !isEmpty(extend)) items.push(...extend)
  })
  if (isEmpty(items)) return result
  const opts = { noHook: true, noCache: true }
  for (const item of items) {
    try {
      for (const k in item) {
        const v = item[k]
        if (typeof v === 'string' && v.slice(0, 2) === '?:') {
          let [, model, field, ...query] = v.split(':')
          if (!field) field = 'id'
          const recs = await this.recordFind(model, { query: query.join(':') }, opts)
          item[k] = (recs[0] ?? {})[field]
        }
        if (v === null) item[k] = undefined
      }
      await this.recordCreate(schema.name, item, { force: true })
      result.success++
      if (spinner) spinner.setText('%s: %d of %d records added', schema.name, result.success, items.length)
    } catch (err) {
      err.model = schema.name
      if (this.app.bajo.applet) this.print.fail(this.validationErrorMessage(err))
      // else this.log.error('Add fixture \'%s@%s\' error: %s', schema.name, schema.connection, err.message)
      result.failed++
    }
  }
  return result
}

export default addFixture
