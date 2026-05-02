import path from 'path'

async function handleNotFound (req, reply) {
  const { isEmpty, isString } = this.app.lib._
  const { routePath } = this.app.waibu
  if (!req.query.notfound) throw this.error('_notFound', { noContent: true })
  const ext = path.extname(req.params.file)
  const replacer = isString(req.query.notfound) ? req.query.notfound : `waibuStatic.asset:/not-found${isEmpty(ext) ? '.png' : ext}`
  return reply.redirectTo(routePath(replacer))
}

async function attachment (req, reply) {
  const { isEmpty, find, last } = this.app.lib._
  const { pascalCase } = this.app.lib.aneka
  const { createThumbnail } = this.app.bajoExtra ?? {}
  const { fs } = this.app.lib
  const mdl = this.app.dobo.getModel(req.params.model)
  const type = req.query.type
  const items = (await mdl.listAttachments({ id: req.params.id, field: req.params.field, file: '*', type })) ?? []
  let item
  if (req.params.file === '_first') item = items[0]
  else if (req.params.file === '_last') item = last(items)
  if (!item) {
    item = find(items, i => {
      const [, model, id, field, file] = i.fullPath.split('/')
      return model === pascalCase(req.params.model) &&
        id === decodeURI(req.params.id) &&
        field === decodeURI(req.params.field) &&
        file === decodeURI(req.params.file)
    })
  }
  if (!item) return await handleNotFound.call(this, req, reply)
  if (req.query.thumbnail) {
    const dir = path.dirname(item.file)
    const ext = path.extname(item.file)
    const base = path.basename(item.file, ext)
    const dest = `${dir}/_tn/${base}-${req.query.thumbnail}.png`
    if (createThumbnail && !fs.existsSync(dest)) {
      const opts = {
        dir: `${dir}/_tn`,
        size: req.query.thumbnail,
        silent: true,
        format: '.png'
      }
      await createThumbnail(item.file, opts)
    }
    if (!fs.existsSync(dest)) await handleNotFound.call(this, req, reply)
    item.mimeType = 'image/png'
    item.file = dest
  }
  if (!isEmpty(item.mimeType)) reply.header('Content-Type', item.mimeType)
  const stream = fs.createReadStream(item.file)
  reply.send(stream)
  return reply
}

export default attachment
