async function updatedAt (opts = {}) {
  const { isSet } = this.app.lib.aneka
  opts.field = opts.field ?? 'updatedAt'
  opts.noOverwrite = opts.noOverwrite ?? false
  return {
    properties: {
      name: opts.field,
      type: 'datetime',
      index: true
    },
    hooks: [{
      name: 'beforeCreateRecord',
      handler: async function (body, options) {
        if (opts.noOverwrite) body[opts.field] = new Date()
        else if (!isSet(body[opts.field])) body[opts.field] = new Date()
      }
    }, {
      name: 'beforeUpdateRecord',
      handler: async function (id, body, options) {
        if (opts.noOverwrite) body[opts.field] = new Date()
        else if (!isSet(body[opts.field])) body[opts.field] = new Date()
      }
    }]
  }
}

export default updatedAt
