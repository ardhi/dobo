import { mergeAttachmentInfo } from './_util.js'
const action = 'findAttachment'

async function findAttachment (...args) {
  if (!this.attachment) return
  if (args.length === 0) return this.action(action, ...args)
  const [id, opts = {}] = args
  const { fastGlob, fs } = this.app.lib
  const { getPluginDataDir } = this.app.bajo
  const dir = `${getPluginDataDir(this.ns)}/attachment/${this.name}/${id}`
  if (!fs.existsSync(dir)) return []
  const files = await fastGlob(`${dir}/**/*`)
  const { fullPath, stats, mimeType } = opts
  const recs = []
  for (const f of files) {
    const item = f.replace(dir, '')
    let [, fieldName, file] = item.split('/')
    if (!file) {
      file = fieldName
      fieldName = null
    }
    const rec = { fieldName, file }
    await mergeAttachmentInfo.call(this, rec, f, { mimeType, fullPath, stats })
    recs.push(rec)
  }
  return recs
}

export default findAttachment
