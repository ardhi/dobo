async function mergeAttachmentInfo (rec, source, { mimeType, stats, fullPath }) {
  const { importPkg } = this.app.bajo
  const { fs } = this.app.lib
  const { pick } = this.app.lib._
  if (!this.app.waibu) return
  const mime = await importPkg('waibu:mime')

  if (mimeType) rec.mimeType = mime.getType(rec.file)
  if (fullPath) rec.fullPath = source
  if (stats) {
    const s = fs.statSync(source)
    rec.stats = pick(s, ['size', 'atime', 'ctime', 'mtime'])
  }
}

export default mergeAttachmentInfo
