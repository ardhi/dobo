import path from 'path'

async function copyUploaded (name, id, options = {}) {
  const { fs } = this.app.lib
  const { req, setField, setFile, mimeType, stats, silent = true } = options
  name = this.attachmentPreCheck(name)
  if (!name) {
    if (silent) return
    throw this.error('isMissing%s', this.t('field.name'))
  }
  if (!this.app.waibu) {
    if (silent) return
    throw this.error('missingPlugin%s', 'Waibu')
  }
  const { dir, files } = await this.app.waibu.getUploadedFiles(req.id, false, true)
  const result = []
  if (files.length === 0) return result
  for (const f of files) {
    let [field, ...parts] = path.basename(f).split('@')
    if (parts.length === 0) continue
    field = setField ?? field
    const file = setFile ?? parts.join('@')
    const opts = { source: f, field, file, mimeType, stats, req, silent: true }
    const rec = await this.attachmentCreate(name, id, opts)
    if (!rec) continue
    delete rec.dir
    result.push(rec)
    if (setField || setFile) break
  }
  fs.removeSync(dir)
  return result
}

export default copyUploaded
