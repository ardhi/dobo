const action = 'getAttachment'

async function getAttachment (...args) {
  if (!this.attachment) return
  if (args.length === 0) return this.action(action, ...args)
  let [id, fieldName, file, opts = {}] = args
  const { find } = this.app.lib._
  const all = await this.findAttachment(id, opts)
  if (fieldName === 'null') fieldName = null
  const data = find(all, { fieldName, file })
  if (!data) throw this.error('notFound', { statusCode: 404 })
  return data
}

export default getAttachment
