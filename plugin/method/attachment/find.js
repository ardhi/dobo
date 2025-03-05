import mergeAttachmentInfo from '../../../lib/merge-attachment-info.js'

async function find (name, id, options = {}) {
  const { fastGlob, fs } = this.app.bajo.lib
  const { getPluginDataDir } = this.app.bajo
  name = this.attachmentPreCheck(name)
  if (!name) return
  const dir = `${getPluginDataDir(this.name)}/attachment/${name}/${id}`
  if (!fs.existsSync(dir)) return []
  const files = await fastGlob(`${dir}/**/*`)
  const { fullPath, stats, mimeType } = options
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

export default find
