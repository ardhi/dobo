import path from 'path'

async function handler (val, rec, opts) {
  const atts = await this.listAttachment({ id: rec.id })
  if (atts.length === 0) return
  let items = atts.filter(att => att.mimeType.startsWith('image/'))
  if (opts.asLink && this.app.waibu) items = items.map(f => `<a href="${f.url}">${opts.baseName ? path.basename(f.file) : f.file}</a>`)
  else if (opts.baseName) items = items.map(f => path.basename(f.file))
  if (opts.single) return items[0]
  return opts.returnAsArray ? items : items.join(', ')
}

async function image (opts = {}) {
  opts.field = opts.field ?? 'image'
  opts.baseName = opts.baseName ?? true
  opts.single = opts.single ?? true
  return {
    properties: {
      name: opts.field,
      type: 'string',
      virtual: true,
      getValue: async function (val, rec) {
        return await handler.call(this, val, rec, { ...opts, asLink: false })
      },
      format: async function (val, rec) {
        return await handler.call(this, val, rec, { ...opts, asLink: true })
      }
    }
  }
}

export default image
