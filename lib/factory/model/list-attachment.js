import path from 'path'

async function listAttachment (...args) {
  if (!this.attachment) return
  if (args.length === 0) return this.action('listAttachment', ...args)
  const [params = {}, opts = {}] = args
  const { map, kebabCase } = this.app.lib._
  const { importPkg, getPluginDataDir } = this.app.bajo
  const mime = await importPkg('waibu:mime')
  const { fastGlob } = this.app.lib

  const { id = '*', fieldName = '*', file = '*' } = params
  const { uriEncoded = true } = opts
  const root = `${getPluginDataDir('dobo')}/attachment`
  let pattern = `${root}/${this.name}/${id}/${fieldName}/${file}`
  if (uriEncoded) pattern = pattern.split('/').map(p => decodeURI(p)).join('/')
  return map(await fastGlob(pattern), f => {
    const mimeType = mime.getType(path.extname(f)) ?? ''
    const fullPath = f.replace(root, '')
    const row = {
      file: f,
      fileName: path.basename(fullPath),
      fullPath,
      mimeType,
      params: { model: this.name, id, fieldName, file }
    }
    if (this.app.waibuMpa) {
      const { routePath } = this.app.waibu
      const [, _model, _id, _fieldName, _file] = fullPath.split('/')
      row.url = routePath(`dobo:/attachment/${kebabCase(_model)}/${_id}/${_fieldName}/${_file}`)
    }
    return row
  })
}

export default listAttachment
