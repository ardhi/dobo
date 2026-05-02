import { getAttachmentPath } from './_util.js'
import path from 'path'
const action = 'removeAttachment'

async function removeAttachment (...args) {
  if (!this.attachment) return
  if (args.length === 0) return this.action(action, ...args)
  const [id, field, file, opts = {}] = args
  const { fs, fastGlob } = this.app.lib
  const fullPath = await getAttachmentPath.call(this, id, field, file)
  const { req } = opts
  await fs.remove(fullPath)
  const dir = path.dirname(fullPath)
  const ext = path.extname(fullPath)
  const base = path.basename(fullPath, ext)
  const pattern = `${dir}/_tn/${base}-*.*`
  const files = await fastGlob(pattern)
  for (const f of files) {
    await fs.remove(f)
  }
  if (!opts.noFlash && req && req.flash) req.flash('notify', req.t('attachmentRemoved'))
}

export default removeAttachment
