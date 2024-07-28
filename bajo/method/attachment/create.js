import mergeAttachmentInfo from '../../../lib/merge-attachment-info.js'

async function create (name, id, options = {}) {
  const { fs } = this.app.bajo.lib
  name = this.attachmentPreCheck(name)
  if (!name) return
  const { source, field, file } = options
  if (!source) throw this.error('Invalid source')
  const baseDir = await this.attachmentGetPath(name, id, field, file, { dirOnly: true })
  const { fullPath, stats, mimeType, req } = options

  let dir = `${baseDir}/${field}`
  if ((field || '').endsWith('[]')) dir = `${baseDir}/${field.replace('[]', '')}`
  const dest = `${dir}/${file}`.replaceAll('//', '/')
  await fs.ensureDir(dir)
  await fs.copy(source, dest)
  const rec = {
    field: field === '' ? undefined : field,
    dir,
    file
  }
  await mergeAttachmentInfo.call(this, rec, dest, { mimeType, fullPath, stats })
  if (req && req.flash) req.flash('dbsuccess', { message: req.i18n.t('File successfully uploaded') })
  return rec
}

export default create
