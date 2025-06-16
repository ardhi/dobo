import path from 'path'

async function attachment (req, reply) {
  const { isString, isEmpty, find } = this.lib._
  const { pascalCase } = this.lib.aneka
  const { routePath } = this.app.waibu
  const { fs } = this.lib
  const items = await this.listAttachments({
    model: req.params.model,
    id: req.params.id,
    field: req.params.field,
    file: '*'
  })
  let item = req.params.file === '_first' ? items[0] : undefined
  if (!item) {
    item = find(items, i => {
      const [, model, id, field, file] = i.fullPath.split('/')
      return model === pascalCase(req.params.model) &&
        id === decodeURI(req.params.id) &&
        field === decodeURI(req.params.field) &&
        file === decodeURI(req.params.file)
    })
  }
  if (!item) {
    if (!req.query.notfound) throw this.error('_notFound', { noContent: true })
    const ext = path.extname(req.params.file)
    const replacer = isString(req.query.notfound) ? req.query.notfound : `waibuStatic.asset:/not-found${isEmpty(ext) ? '.png' : ext}`
    return reply.redirectTo(routePath(replacer))
  }
  if (!isEmpty(item.mimeType)) reply.header('Content-Type', item.mimeType)
  const stream = fs.createReadStream(item.file)
  reply.send(stream)
  return reply
}

export default attachment
