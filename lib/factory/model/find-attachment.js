import { mergeAttachmentInfo } from './_util.js'

async function findAttachment (id, opts = {}) {
  if (!this.attachment) return
  const { fastGlob, fs } = this.app.lib
  const { getPluginDataDir } = this.app.bajo
  const dir = `${getPluginDataDir(this.ns)}/attachment/${this.name}/${id}`
  if (!fs.existsSync(dir)) return []
  const files = await fastGlob(`${dir}/**/*`)
  const { fullPath, stats, mimeType } = opts
  const recs = []
  for (const f of files) {
    const item = f.replace(dir, '')
    let [, field, file] = item.split('/')
    if (!file) {
      file = field
      field = null
    }
    const rec = { field, file }
    await mergeAttachmentInfo.call(this, rec, f, { mimeType, fullPath, stats })
    recs.push(rec)
  }
  return recs
}

export default findAttachment
