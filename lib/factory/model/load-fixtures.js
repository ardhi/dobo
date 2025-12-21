import path from 'path'

async function loadFixtures (spinner) {
  const { readConfig, eachPlugins, getPluginDataDir } = this.app.bajo
  const { resolvePath } = this.app.lib.aneka
  const { isEmpty, isArray, isString } = this.app.lib._
  const { fs } = this.app.lib
  if (this.connection.proxy) {
    this.log.warn('proxiedConnBound%s', this.name)
    return
  }
  const result = { success: 0, failed: 0 }
  const base = path.basename(this.file, path.extname(this.file))
  // original
  const pattern = resolvePath(`${path.dirname(this.file)}/../fixture/${base}.*`)
  let items = await readConfig(pattern, { ns: this.plugin.ns, ignoreError: true })
  if (isEmpty(items)) items = []
  // override
  const overrides = await readConfig(`${this.app.main.dir.pkg}/extend/dobo/override/${this.plugin.ns}/fixture/${base}.*`, { ns: this.plugin.ns, ignoreError: true })

  if (isArray(overrides) && !isEmpty(overrides)) items = overrides
  // extend
  const me = this
  await eachPlugins(async function ({ dir }) {
    const { ns } = this
    const extend = await readConfig(`${dir}/extend/dobo/extend/${me.plugin.ns}/fixture/${base}.*`, { ns, ignoreError: true })
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
          const ref = this.getModel(model)
          const recs = await ref.findRecord({ query: query.join(':') }, opts)
          item[k] = (recs[0] ?? {})[field]
        }
        if (v === null) item[k] = undefined
      }
      const resp = await this.createRecord(item, { force: true })
      if (isArray(item._attachments) && item._attachments.length > 0) {
        for (let att of item._attachments) {
          if (isString(att)) att = { field: 'file', file: att }
          const fname = path.basename(att.file)
          if (fs.existsSync(att.file)) {
            const dest = `${getPluginDataDir(this.plugin.ns)}/${resp.id}/${att.field}/${fname}`
            try {
              fs.copySync(att.file, dest)
            } catch (err) {}
          }
        }
      }
      result.success++
      if (spinner) spinner.setText('recordsAdded%s%d%d', this.name, result.success, items.length)
    } catch (err) {
      console.log(err)
      err.model = this.name
      if (this.app.applet) this.print.fail(this.validationErrorMessage(err))
      result.failed++
    }
  }
  return result
}

export default loadFixtures
