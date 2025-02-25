import path from 'path'

async function copyUploaded (name, id, options = {}) {
  const { fs } = this.app.bajo.lib
  const { omit } = this.app.bajo.lib._
  console.log(omit(options, ['req']))
  const { req, setField, setFile, mimeType, stats, silent = true } = options
  name = this.attachmentPreCheck(name)
  if (!name) {
    if (silent) return
    throw this.error('isMissing%s', this.print.write('field.name'))
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
    const opts = { source: f, field, file, mimeType, stats, req }
    console.log(setField, setFile, omit(opts, ['req']))
    const rec = await this.attachmentCreate(name, id, opts)
    delete rec.dir
    result.push(rec)
    if (setField || setFile) break
  }
  fs.removeSync(dir)
  return result
}

export default copyUploaded
