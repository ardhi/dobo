async function remove (name, id, field, file, options = {}) {
  const { fs } = this.app.bajo.lib
  name = this.attachmentPreCheck(name)
  if (!name) return
  const path = await this.attachmentGetPath(name, id, field, file)
  const { req } = options
  await fs.remove(path)
  if (req && req.flash) req.flash('dbsuccess', { message: req.i18n.t('File successfully removed') })
}

export default remove
