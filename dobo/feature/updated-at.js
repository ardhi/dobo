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
        const { isSet } = this.lib.aneka
        const now = new Date()
        if (opts.overwrite || !isSet(body[opts.fieldName])) body[opts.fieldName] = now
      },
      beforeUpdate: async function ({ body }) {
        const { isSet } = this.lib.aneka
        const now = new Date()
        if (opts.overwrite || !isSet(body[opts.fieldName])) body[opts.fieldName] = now
      }
    }
  }
}

export default updatedAt
