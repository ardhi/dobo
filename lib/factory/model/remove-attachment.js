import { getAttachmentPath } from './_util.js'

async function removeAttachment (id, field, file, opts = {}) {
  if (!this.attachment) return
  const { fs } = this.app.lib
  const path = await getAttachmentPath.call(this, id, field, file)
  const { req } = opts
  await fs.remove(path)
  if (!opts.noFlash && req && req.flash) req.flash('notify', req.t('attachmentRemoved'))
}

export default removeAttachment
