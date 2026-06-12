import path from 'path'

async function exec ({ body, spinner, options, result, bodies } = {}) {
  const { isArray, isString } = this.app.lib._
  const { fs } = this.app.lib

  await this.transaction(async (trx) => {
    const resp = await this.createRecord(body, { ...options, trx })
    if (isArray(body._attachments) && body._attachments.length > 0) {
      for (let att of body._attachments) {
        if (isString(att)) att = { field: 'file', file: att }
        const fname = path.basename(att.file)
        if (fs.existsSync(att.file)) {
          const dest = `${this.app.getPluginDataDir(this.plugin.ns)}/${resp.id}/${att.field}/${fname}`
          try {
            fs.copySync(att.file, dest)
          } catch (err) {}
        }
      }
    }
  })
  result.success++
  if (spinner) spinner.setText('recordsAdded%s%d%d', this.name, result.success, bodies.length)
}

async function loadFixtures ({ spinner, ignoreError = true, collectItems = false, noLookup = false } = {}, options = {}) {
  const { readConfig } = this.app.bajo
  const { isEmpty } = this.app.lib._
  if (this.connection.proxy) {
    this.log.warn('proxiedConnBound%s', this.name)
    return
  }
  const result = { success: 0, failed: 0 }
  const bodies = await readConfig(`${this.plugin.ns}:/extend/dobo/fixture/${this.baseName}.*`, { ns: this.plugin.ns, baseNs: 'dobo', checkOverride: true, defValue: [] })
  const opts = {
    ...options,
    noModelHook: false,
    noHook: true,
    noDynHook: true,
    noValidation: false,
    noCache: true
  }
  for (const body of bodies) {
    await this.sanitizeFixture({ body, noLookup }, options)
  }
  if (collectItems) return bodies
  if (isEmpty(bodies)) return result
  for (const body of bodies) {
    if (ignoreError) {
      try {
        await exec.call(this, { body, spinner, options: opts, result, bodies })
      } catch (err) {
        if (this.app.bajo.config.log.applet) console.error(err)
        err.model = this.name
        if (this.app.applet) this.plugin.print.fail(this.app.dobo.validationErrorMessage(err))
        result.failed++
      }
    } else await exec.call(this, { body, spinner, options: opts, result, bodies })
  }
  return result
}

export default loadFixtures
