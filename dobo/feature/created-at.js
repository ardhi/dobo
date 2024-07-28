async function createdAt (opts = {}) {
  opts.fieldName = opts.fieldName ?? 'createdAt'
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
      }
    }
  }
}

export default createdAt
