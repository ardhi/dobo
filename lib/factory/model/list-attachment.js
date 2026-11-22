import { formatAttachment } from './helper.js'

const action = 'listAttachment'

async function listAttachment (...args) {
  const { trim, cloneDeep } = this.app.lib._
  if (!this.options.attachment || !this.app.waibu) return []
  if (args.length === 0) return this.action(action, ...args)
  const [params = {}, options = {}] = args
  const { isString } = this.app.lib._
  const { fastGlob } = this.app.lib
  const mimeTypes = cloneDeep(this.app.lib.mimeTypes)

  let { id = '*', field = '*', file = '*', types = [] } = params
  const { uriEncoded = true, stats, mimeType, fullFile, thumbnail } = options
  const root = `${this.app.getPluginDataDir('dobo')}/attachment`
  const baseDir = `${root}/${this.name}/${id}/${field}/${file}`
  let pattern = baseDir
  if (isString(types)) types = types.split(',')
  const exts = []
  for (const t of types) {
    if (mimeTypes[t]) exts.push(...mimeTypes[t])
    else exts.push(t)
  }
  types = types.map(t => trim(t, '.'))
  if (types.length === 1) pattern += `.${exts[0]}`
  else if (types.length > 1) pattern += `.{${exts.join(',')}}`
  if (uriEncoded) pattern = pattern.split('/').map(p => decodeURI(p)).join('/')
  const items = []
  const files = await fastGlob([pattern, `!${baseDir}/_tn/*`])
  for (const item of files) {
    items.push(await formatAttachment.call(this, item, { stats, mimeType, fullFile, thumbnail }))
  }
  return items
}

export default listAttachment
