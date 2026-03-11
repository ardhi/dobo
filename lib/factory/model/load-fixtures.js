import path from 'path'

async function exec ({ item, spinner, options, result, items } = {}) {
  const { isArray, isString } = this.app.lib._
  const { getPluginDataDir } = this.app.bajo
  const { fs } = this.app.lib
  const resp = await this.createRecord(item, options)
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
}

async function loadFixtures ({ spinner, ignoreError = true, collectItems = false, noLookup = false } = {}, options = {}) {
  const { readConfig, eachPlugins } = this.app.bajo
  const { resolvePath } = this.app.lib.aneka
  const { isEmpty, isArray, omit } = this.app.lib._
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
  const opts = { noHook: true, noCache: true, ...(omit(options, ['noHook', 'noCache'])) }
  for (const item of items) {
    for (const k in item) {
      const v = item[k]
      if (!noLookup && typeof v === 'string' && v.slice(0, 2) === '?:') item[k] = await this._simpleLookup(v.slice(2), opts)
      if (v === null) item[k] = undefined
      else {
        const prop = this.properties.find(item => item.name === k)
        if (prop && ['string', 'text'].includes(prop.type)) item[k] += ''
      }
    }
  }
  if (collectItems) return items
  if (isEmpty(items)) return result
  for (const item of items) {
    if (ignoreError) {
      try {
        await exec.call(this, { item, spinner, opts, options, result, items })
      } catch (err) {
        // console.log(err)
        err.model = this.name
        if (this.app.applet) this.plugin.print.fail(this.app.dobo.validationErrorMessage(err))
        result.failed++
      }
    } else await exec.call(this, { item, spinner, opts, options, result, items })
  }
  return result
}

export default loadFixtures
