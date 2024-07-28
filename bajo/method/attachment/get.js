async function get (name, id, field, file, options = {}) {
  name = this.attachmentPreCheck(name)
  if (!name) return
  const { find } = this.app.bajo.lib._
  const all = await this.attachmentFind(name, id, options)
  if (field === 'null') field = null
  const data = find(all, { field, file })
  if (!data) throw this.error('notfound', { statusCode: 404 })
  return data
}

export default get
