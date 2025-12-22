async function getAttachment (...args) {
  if (!this.attachment) return
  if (args.length === 0) return this.action('getAttachment', ...args)
  let [id, field, file, opts = {}] = args
  const { find } = this.app.lib._
  const all = await this.findAttachment(id, opts)
  if (field === 'null') field = null
  const data = find(all, { field, file })
  if (!data) throw this.error('notFound', { statusCode: 404 })
  return data
}

export default getAttachment
