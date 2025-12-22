import { mergeAttachmentInfo, getAttachmentPath } from './_util.js'

async function createAttachment (...args) {
  if (!this.attachment) return
  if (args.length === 0) return this.action('createAttachment', ...args)
  const [id, opts = {}] = args
  const { fs } = this.app.lib
  const { isEmpty } = this.app.lib._
  const { source, field = 'file', file, fullPath, stats, mimeType, req } = opts
  if (isEmpty(file)) return
  if (!source) throw this.plugin.error('isMissing%s', this.plugin.t('field.source'))
  const baseDir = await getAttachmentPath.call(this, id, field, file, { dirOnly: true })
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
  if (!opts.noFlash && req && req.flash) req.flash('notify', req.t('attachmentUploaded'))
  return rec
}

export default createAttachment
