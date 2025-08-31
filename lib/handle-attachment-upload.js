async function handleAttachmentUpload ({ action, name, id, options = {} } = {}) {
  const { getPluginDataDir } = this.app.bajo
  const { fs } = this.app.lib
  const { req, mimeType, stats, setFile, setField } = options

  name = this.attachmentPreCheck(name)
  if (!name) return
  if (action === 'remove') {
    const dir = `${getPluginDataDir(this.name)}/attachment/${name}/${id}`
    await fs.remove(dir)
    return
  }
  return this.attachmentCopyUploaded(name, id, { req, mimeType, stats, setFile, setField })
}

export default handleAttachmentUpload
