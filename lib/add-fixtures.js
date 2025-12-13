import path from 'path'

async function addFixture (name, { spinner } = {}) {
  const { resolvePath, readConfig, eachPlugins, getPluginDataDir } = this.app.bajo
  const { isEmpty, isArray, isString } = this.app.lib._
  const { fs } = this.app.lib
  const { schema, connection } = this.getInfo(name)
  if (connection.proxy) {
    this.log.warn('proxiedConnBound%s', schema.name)
    return
  }
  const result = { success: 0, failed: 0 }
  const base = path.basename(schema.file, path.extname(schema.file))
  // original
  const pattern = resolvePath(`${path.dirname(schema.file)}/../fixture/${base}.*`)
  let items = await readConfig(pattern, { ns: schema.ns, ignoreError: true })
  if (isEmpty(items)) items = []
  // override
  const overrides = await readConfig(`${this.app.main.dir.pkg}/extend/dobo/override/${schema.ns}/fixture/${base}.*`, { ns: this.ns, ignoreError: true })

  if (isArray(overrides) && !isEmpty(overrides)) items = overrides
  // extend
  await eachPlugins(async function ({ dir }) {
    const { ns } = this
    const extend = await readConfig(`${dir}/extend/dobo/extend/${schema.ns}/fixture/${base}.*`, { ns, ignoreError: true })
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
      const resp = await this.recordCreate(schema.name, item, { force: true })
      if (isArray(item._attachments) && item._attachments.length > 0) {
        for (let att of item._attachments) {
          if (isString(att)) att = { field: 'file', file: att }
          const fname = path.basename(att.file)
          if (fs.existsSync(att.file)) {
            const dest = `${getPluginDataDir(schema.ns)}/${resp.id}/${att.field}/${fname}`
            try {
              fs.copySync(att.file, dest)
            } catch (err) {}
          }
        }
      }
      result.success++
      if (spinner) spinner.setText('recordsAdded%s%d%d', schema.name, result.success, items.length)
    } catch (err) {
      console.log(err)
      err.model = schema.name
      if (this.app.applet) this.print.fail(this.validationErrorMessage(err))
      result.failed++
    }
  }
  return result
}

export default addFixture
