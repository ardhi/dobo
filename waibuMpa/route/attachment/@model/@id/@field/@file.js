import path from 'path'

async function attachment (req, reply) {
  const { isString } = this.lib._
  const { importPkg, getPluginDataDir, pascalCase } = this.app.bajo
  const { routePath } = this.app.waibu
  const mime = await importPkg('waibu:mime')
  const { fs } = this.lib
  const file = `${getPluginDataDir('dobo')}/attachment/${pascalCase(req.params.model)}/${req.params.id}/${req.params.field}/${req.params.file}`
  const mimeType = mime.getType(path.extname(file))
  if (!fs.existsSync(file)) {
    if (!req.query.notfound) throw this.error('_notFound', { noContent: true })
    const [, ext] = mimeType.split('/')
    const replacer = isString(req.query.notfound) ? req.query.notfound : `waibuStatic.asset:/not-found.${ext}`
    return reply.redirectTo(routePath(replacer))
  }
  reply.header('Content-Type', mimeType)
  const stream = fs.createReadStream(file)
  reply.send(stream)
  return reply
}

export default attachment
