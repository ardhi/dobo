async function getAttachment (id, field, file, opts = {}) {
  if (!this.attachment) return
  const { find } = this.app.lib._
  const all = await this.findAttachment(id, opts)
  if (field === 'null') field = null
  const data = find(all, { field, file })
  if (!data) throw this.error('notFound', { statusCode: 404 })
  return data
}

export default getAttachment
