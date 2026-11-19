import { formatAttachment } from './helper.js'
const action = 'findAttachment'

async function findAttachment (...args) {
  if (!this.options.attachment) return
  if (args.length === 0) return this.action(action, ...args)
  const [id, opts = {}] = args
  const { fastGlob, fs } = this.app.lib
  const dir = `${this.app.getPluginDataDir('dobo')}/attachment/${this.name}/${id}`
  if (!fs.existsSync(dir)) return []
  const files = await fastGlob(`${dir}/*/*`)
  const items = []
  for (const f of files) {
    items.push(await formatAttachment.call(this, f, opts))
  }
  return items
}

export default findAttachment
