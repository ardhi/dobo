async function createdAt (opts = {}) {
  opts.field = opts.field ?? 'createdAt'
  opts.noOverwrite = opts.noOverwrite ?? false
  return {
    properties: [{
      name: opts.field,
      type: 'datetime',
      index: true
    }],
    hooks: [{
      name: 'beforeCreateRecord',
      handler: async function (body, options) {
        const { isSet } = this.app.lib.aneka
        if (opts.noOverwrite) body[opts.field] = new Date()
        else if (!isSet(body[opts.field])) body[opts.field] = new Date()
      }
    }]
  }
}

export default createdAt
