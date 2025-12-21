async function updatedAt (opts = {}) {
  opts.fieldName = opts.fieldName ?? 'updatedAt'
  opts.overwrite = opts.overwrite ?? true
  return {
    properties: {
      name: opts.fieldName,
      type: 'datetime',
      index: true
    },
    hooks: [{
      name: 'beforeCreateRecord',
      handler: async function (body, options) {
        const { isSet } = this.app.lib.aneka
        const now = new Date()
        if (opts.overwrite || !isSet(body[opts.fieldName])) body[opts.fieldName] = now
      }
    }, {
      name: 'beforeUpdateRecord',
      handler: async function (id, body, options) {
        const { isSet } = this.app.lib.aneka
        const now = new Date()
        if (opts.overwrite || !isSet(body[opts.fieldName])) body[opts.fieldName] = now
      }
    }]
  }
}

export default updatedAt
