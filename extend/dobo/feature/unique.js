import crypto from 'crypto'

async function handler (body, options, opts) {
  const { omit } = this.app.lib._
  if (opts.fields.length === 0) opts.fields = omit(this.properties.map(prop => prop.name), [opts.field])
  const item = {}
  for (const f of opts.fields) {
    item[f] = body[f]
  }
  body[opts.field] = crypto.createHash('md5').update(JSON.stringify(item)).digest('hex')
}

async function unique (opts = {}) {
  opts.field = opts.field ?? 'id'
  opts.fields = opts.fields ?? []
  return {
    properties: [{
      name: opts.field,
      type: 'string',
      maxLength: 32,
      required: true,
      index: 'primary'
    }],
    hooks: [{
      name: 'beforeCreateRecord',
      level: 1000,
      handler: async function (body, options) {
        await handler.call(this, body, options, opts)
      }
    }, {
      name: 'beforeBulkCreateRecord',
      level: 1000,
      handler: async function (bodies, options) {
        for (const body of bodies) {
          await handler.call(this, body, options, opts)
        }
      }
    }]
  }
}

export default unique
