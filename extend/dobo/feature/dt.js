async function dt (opts = {}) {
  opts.field = opts.field ?? 'dt'
  opts.type = opts.type ??'datetime'
  opts.formatInt = opts.formatInt ?? false
  opts.formatValueInt = opts.formatValueInt ?? false
  const prop = {
    name: opts.field ?? 'dt',
    type: opts.type,
    required: opts.required ?? true,
    index: opts.index ?? true
  }
  if (opts.type === 'integer') {
    if (opts.formatInt) {
      prop.format = async function (val, data, { req } = {}) {
        const dt = new Date(data._orig[opts.field])
        return req ? req.format(dt, 'datetime') : this.app.bajo.format(dt, 'datetime', { lang: req.lang })
      }
    }
    if (opts.formatValueInt) {
      prop.format = async function (val, data, { req } = {}) {
        return new Date(data._orig[opts.field])
      }
    }
  }

  return {
    properties: [prop]
  }
}

export default dt
