async function mergeAttachmentInfo (rec, source, { mimeType, stats, fullPath }) {
  const { importPkg } = this.app.bajo
  const { fs } = this.app.bajo.lib
  const { pick } = this.app.bajo.lib._
  if (!this.bajoWeb) return
  const mime = await importPkg('bajoWeb:mime')

  if (mimeType) rec.mimeType = mime.getType(rec.file)
  if (fullPath) rec.fullPath = source
  if (stats) {
    const s = fs.statSync(source)
    rec.stats = pick(s, ['size', 'atime', 'ctime', 'mtime'])
  }
}

export default mergeAttachmentInfo
