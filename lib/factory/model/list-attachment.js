import path from 'path'

async function listAttachment (params = {}, opts = {}) {
  const { map, kebabCase } = this.app.lib._
  const { importPkg, getPluginDataDir } = this.app.bajo
  const mime = await importPkg('waibu:mime')
  const { fastGlob } = this.app.lib

  const { id = '*', field = '*', file = '*' } = params
  const { uriEncoded = true } = opts
  const root = `${getPluginDataDir('dobo')}/attachment`
  let pattern = `${root}/${this.name}/${id}/${field}/${file}`
  if (uriEncoded) pattern = pattern.split('/').map(p => decodeURI(p)).join('/')
  return map(await fastGlob(pattern), f => {
    const mimeType = mime.getType(path.extname(f)) ?? ''
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
      row.url = routePath(`dobo:/attachment/${kebabCase(_model)}/${_id}/${_field}/${_file}`)
    }
    return row
  })
}

export default listAttachment
