import path from 'path'

async function attachment (req, reply) {
  const { isString, isEmpty } = this.lib._
  const { importPkg, getPluginDataDir, pascalCase } = this.app.bajo
  const { routePath } = this.app.waibu
  const mime = await importPkg('waibu:mime')
  const { fs, fastGlob } = this.lib
  let file = `${getPluginDataDir('dobo')}/attachment/${pascalCase(req.params.model)}/${req.params.id}/${req.params.field}/${req.params.file}`
  if (path.basename(file) === '_first') {
    const files = await fastGlob(`${path.dirname(file)}/*`)
    if (files.length > 0) file = files[0]
  }
  const mimeType = mime.getType(path.extname(file)) ?? ''
  if (!fs.existsSync(file)) {
    if (!req.query.notfound) throw this.error('_notFound', { noContent: true })
    const [, ext] = mimeType.split('/')
    const replacer = isString(req.query.notfound) ? req.query.notfound : `waibuStatic.asset:/not-found.${ext ?? 'png'}`
    return reply.redirectTo(routePath(replacer))
  }
  if (!isEmpty(mimeType)) reply.header('Content-Type', mimeType)
  const stream = fs.createReadStream(file)
  reply.send(stream)
  return reply
}

export default attachment
