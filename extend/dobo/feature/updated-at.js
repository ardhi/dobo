async function updatedAt (opts = {}) {
  const { isSet } = this.app.lib.aneka
  opts.fieldName = opts.fieldName ?? 'updatedAt'
  opts.noOverwrite = opts.noOverwrite ?? false
  return {
    properties: {
      name: opts.fieldName,
      type: 'datetime',
      index: true
    },
    hooks: [{
      name: 'beforeCreateRecord',
      handler: async function (body, options) {
        if (opts.noOverwrite) body[opts.fieldName] = new Date()
        else if (!isSet(body[opts.fieldName])) body[opts.fieldName] = new Date()
      }
    }, {
      name: 'beforeUpdateRecord',
      handler: async function (id, body, options) {
        if (opts.noOverwrite) body[opts.fieldName] = new Date()
        else if (!isSet(body[opts.fieldName])) body[opts.fieldName] = new Date()
      }
    }]
  }
}

export default updatedAt
