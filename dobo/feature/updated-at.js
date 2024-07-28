async function updatedAt (opts = {}) {
  opts.fieldName = opts.fieldName ?? 'updatedAt'
  opts.overwrite = opts.overwrite ?? true
  return {
    properties: {
      name: opts.fieldName,
      type: 'datetime',
      index: true
    },
    hook: {
      beforeCreate: async function ({ body }) {
        const now = new Date()
        if (opts.overwrite || !this.app.bajo.isSet(body[opts.fieldName])) body[opts.fieldName] = now
      },
      beforeUpdate: async function ({ body }) {
        const now = new Date()
        if (opts.overwrite || !this.app.bajo.isSet(body[opts.fieldName])) body[opts.fieldName] = now
      }
    }
  }
}

export default updatedAt
