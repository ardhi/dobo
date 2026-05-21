import path from 'path'

async function exec ({ item, spinner, options, result, items } = {}) {
  const { isArray, isString } = this.app.lib._
  const { getPluginDataDir } = this.app.bajo
  const { fs } = this.app.lib

  await this.transaction(async (trx) => {
    const resp = await this.createRecord(item, { ...options, trx })
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
  })
  result.success++
  if (spinner) spinner.setText('recordsAdded%s%d%d', this.name, result.success, items.length)
}

async function loadFixtures ({ spinner, ignoreError = true, collectItems = false, noLookup = false } = {}, options = {}) {
  const { readConfig } = this.app.bajo
  const { resolvePath, isSet } = this.app.lib.aneka
  const { isEmpty, isString, isArray, pullAt } = this.app.lib._
  if (this.connection.proxy) {
    this.log.warn('proxiedConnBound%s', this.name)
    return
  }
  const result = { success: 0, failed: 0 }
  const base = path.basename(this.options.file, path.extname(this.options.file))
  const pattern = resolvePath(`${path.dirname(this.options.file)}/../fixture/${base}.*`)
  const items = await readConfig(pattern, { ns: this.plugin.ns, baseNs: 'dobo', checkOverride: true, defValue: [] })
  const opts = { ...options, noMagic: true }
  for (const item of items) {
    const lv = {}
    const deleted = {}
    for (const key in item) {
      const val = item[key]
      deleted[key] = deleted[key] ?? []
      if (!noLookup) {
        if (isString(val) && val.slice(0, 2) === '?:') {
          item[key] = await this._simpleLookup(val.slice(2), lv, opts)
          lv[key] = item[key]
        } else if (isArray(val)) {
          for (const idx in val) {
            if (isString(val[idx]) && val[idx].slice(0, 2) === '?:') {
              item[key][idx] = await this._simpleLookup(val[idx].slice(2), lv, opts)
              if (isSet(item[key][idx])) item[key][idx] += ''
              else deleted[key].push(idx)
              lv[`${key}.${idx}`] = item[key][idx]
            }
          }
          if (deleted[key].length > 0) pullAt(item[key], deleted[key])
        }
      }
      delete deleted[key]
      if (val === null) item[key] = undefined
      else {
        const prop = this.properties.find(item => item.name === key)
        if (prop && ['string', 'text'].includes(prop.type)) item[key] += ''
      }
    }
  }
  if (collectItems) return items
  if (isEmpty(items)) return result
  for (const item of items) {
    if (ignoreError) {
      try {
        await exec.call(this, { item, spinner, options, result, items })
      } catch (err) {
        if (this.app.bajo.config.log.applet) console.error(err)
        err.model = this.name
        if (this.app.applet) this.plugin.print.fail(this.app.dobo.validationErrorMessage(err))
        result.failed++
      }
    } else await exec.call(this, { item, spinner, options, result, items })
  }
  return result
}

export default loadFixtures
