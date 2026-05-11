async function createHandler (body, options, opts) {
  const { isSet } = this.app.lib.aneka
  if (opts.noOverwrite) body[opts.field] = new Date()
  else if (!isSet(body[opts.field])) body[opts.field] = new Date()
}

async function updatedAt (opts = {}) {
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
        await createHandler.call(this, body, options, opts)
      }
    }, {
      name: 'beforeBulkCreateRecord',
      handler: async function (bodies, options) {
        for (const body of bodies) {
          await createHandler.call(this, body, options, opts)
        }
      }
    }, {
      name: 'beforeUpdateRecord',
      handler: async function (id, body, options) {
        await createHandler.call(this, body, options, opts)
      }
    }]
  }
}

export default updatedAt
