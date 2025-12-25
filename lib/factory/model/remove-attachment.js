import { getAttachmentPath } from './_util.js'

async function removeAttachment (...args) {
  if (!this.attachment) return
  if (args.length === 0) return this.action('removeAttachment', ...args)
  const [id, fieldName, file, opts = {}] = args
  const { fs } = this.app.lib
  const path = await getAttachmentPath.call(this, id, fieldName, file)
  const { req } = opts
  await fs.remove(path)
  if (!opts.noFlash && req && req.flash) req.flash('notify', req.t('attachmentRemoved'))
}

export default removeAttachment
