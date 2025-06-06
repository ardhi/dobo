async function remove (name, id, field, file, options = {}) {
  const { fs } = this.lib
  name = this.attachmentPreCheck(name)
  if (!name) return
  const path = await this.attachmentGetPath(name, id, field, file)
  const { req } = options
  await fs.remove(path)
  if (req && req.flash) req.flash('notify', req.t('attachmentRemoved'))
}

export default remove
