async function createdAt (opts = {}) {
  opts.fieldName = opts.fieldName ?? 'createdAt'
  opts.noOverwrite = opts.noOverwrite ?? false
  return {
    properties: [{
      name: opts.fieldName,
      type: 'datetime',
      index: true
    }],
    hooks: [{
      name: 'beforeCreateRecord',
      handler: async function (body, options) {
        const { isSet } = this.app.lib.aneka
        if (opts.noOverwrite) body[opts.fieldName] = new Date()
        else if (!isSet(body[opts.fieldName])) body[opts.fieldName] = new Date()
      }
    }]
  }
}

export default createdAt
