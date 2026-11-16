import path from 'path'
const action = 'listAttachment'
const mimeTypes = {
  image: ['jpg', 'jpeg', 'gif', 'png', 'webp', 'avif', 'svg'],
  video: ['mp4', 'm4v', 'webm', 'mov', 'qt', 'mkv', 'ogg', 'ogv']
}

async function listAttachment (...args) {
  if (!this.options.attachment || !this.app.waibu) return []
  if (args.length === 0) return this.action(action, ...args)
  const [params = {}, options = {}] = args
  const { map, kebabCase, pick, isString } = this.app.lib._
  const { importPkg } = this.app.bajo
  const mime = await importPkg('waibu:mime')
  const { fastGlob, fs } = this.app.lib

  let { id = '*', field = '*', file = '*', types = [], thumbnail = false } = params
  let { uriEncoded = true, keys = [] } = options
  const root = `${this.app.getPluginDataDir('dobo')}/attachment`
  const baseDir = `${root}/${this.name}/${id}/${field}/${file}`
  let pattern = baseDir
  if (isString(types)) types = types.split(',')
  const exts = []
  for (const t of types) {
    if (mimeTypes[t]) exts.push(...mimeTypes[t])
    else exts.push(t)
  }
  if (types.length > 0) pattern += `.{${exts.join(',')}}`
  if (uriEncoded) pattern = pattern.split('/').map(p => decodeURI(p)).join('/')
  return map(await fastGlob([pattern, `!${baseDir}/_tn/*`]), f => {
    const mimeType = mime.getType(path.extname(f))
    const fullPath = f.replace(root, '')
    const row = {
      file: f,
      fileName: path.basename(fullPath),
      fullPath,
      mimeType,
      params: { model: this.name, id, field, file }
    }
    if (this.app.waibuMpa) {
      const { routePath } = this.app.waibu
      const [, _model, _id, _field, _file] = fullPath.split('/')
      if (thumbnail) {
        const tn = {}
        const dir = path.dirname(fullPath)
        const ext = path.extname(fullPath)
        const base = path.basename(fullPath, ext)
        for (const size of ['l', 'm', 's']) {
          const tnPath = `/_tn/${base}-${size}.png`
          if (fs.existsSync(`${root}${dir}${tnPath}`)) tn[size] = routePath(`dobo:/attachment/${kebabCase(_model)}/${_id}/${_field}${tnPath}`)
        }
        row.thumbnail = tn
      }
      row.url = routePath(`dobo:/attachment/${kebabCase(_model)}/${_id}/${_field}/${_file}`)
    }
    if (keys.length === 0) keys = Object.keys(row)
    return pick(row, keys)
  })
}

export default listAttachment
