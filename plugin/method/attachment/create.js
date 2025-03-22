import mergeAttachmentInfo from '../../../lib/merge-attachment-info.js'

async function create (name, id, options = {}) {
  const { fs } = this.lib
  name = this.attachmentPreCheck(name)
  if (!name) return
  const { source, field, file } = options
  if (!source) throw this.error('isMissing%s', this.print.write('field.source'))
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
  if (req && req.flash) req.flash('notify', req.t('attachmentUploaded'))
  return rec
}

export default create
