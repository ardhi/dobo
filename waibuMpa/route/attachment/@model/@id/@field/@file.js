import path from 'path'

async function attachment (req, reply) {
  const { importPkg, getPluginDataDir, pascalCase } = this.app.bajo
  const mime = await importPkg('waibu:mime')
  const { fs } = this.app.bajo.lib
  const file = `${getPluginDataDir('dobo')}/attachment/${pascalCase(req.params.model)}/${req.params.id}/${req.params.field}/${req.params.file}`
  if (!fs.existsSync(file)) throw this.error('_notFound', { noView: true })
  const mimeType = mime.getType(path.extname(file))
  reply.header('Content-Type', mimeType)
  const stream = fs.createReadStream(file)
  reply.send(stream)
  return reply
}

export default attachment
