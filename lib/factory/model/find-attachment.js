import listAttachment from './list-attachment.js'
const action = 'findAttachment'

async function findAttachment (...args) {
  if (!this.options.attachment) return
  if (args.length === 0) return this.action(action, ...args)
  const [id, params = {}, opts = {}] = args
  params.id = id
  return await listAttachment.call(this, params, opts)
}

export default findAttachment
