import path from 'path'

async function copyUploaded (name, id, { req, setField, setFile, mimeType, stats, silent = true } = {}) {
  const { fs } = this.app.bajo.lib
  name = this.attachmentPreCheck(name)
  if (!name) {
    if (silent) return
    throw this.error('Name must be provided')
  }
  if (!this.bajoWeb) {
    if (silent) return
    throw this.error('Plugin \'%s\' is missing')
  }
  const { dir, files } = await this.bajoWeb.getUploadedFiles(req.id, false, true)
  const result = []
  if (files.length === 0) return result
  for (const f of files) {
    let [field, ...parts] = path.basename(f).split('@')
    if (parts.length === 0) continue
    field = setField ?? field
    const file = setFile ?? parts.join('@')
    const opts = { source: f, field, file, mimeType, stats, req }
    const rec = await this.attachmentCreate(name, id, opts)
    delete rec.dir
    result.push(rec)
    if (setField || setFile) break
  }
  fs.removeSync(dir)
  return result
}

export default copyUploaded
