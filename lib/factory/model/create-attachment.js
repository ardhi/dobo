import { mergeAttachmentInfo, getAttachmentPath } from './_util.js'

async function createAttachment (...args) {
  if (!this.attachment) return
  if (args.length === 0) return this.action('createAttachment', ...args)
  const [id, opts = {}] = args
  const { fs } = this.app.lib
  const { isEmpty } = this.app.lib._
  const { source, fieldName = 'file', file, fullPath, stats, mimeType, req } = opts
  if (isEmpty(file)) return
  if (!source) throw this.plugin.error('isMissing%s', this.plugin.t('field.source'))
  const baseDir = await getAttachmentPath.call(this, id, fieldName, file, { dirOnly: true })
  let dir = `${baseDir}/${fieldName}`
  if ((fieldName || '').endsWith('[]')) dir = `${baseDir}/${fieldName.replace('[]', '')}`
  const dest = `${dir}/${file}`.replaceAll('//', '/')
  await fs.ensureDir(dir)
  await fs.copy(source, dest)
  const rec = {
    field: fieldName === '' ? undefined : fieldName,
    dir,
    file
  }
  await mergeAttachmentInfo.call(this, rec, dest, { mimeType, fullPath, stats })
  if (!opts.noFlash && req && req.flash) req.flash('notify', req.t('attachmentUploaded'))
  return rec
}

export default createAttachment
