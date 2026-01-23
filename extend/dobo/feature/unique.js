import crypto from 'crypto'

async function unique (opts = {}) {
  const { omit } = this.app.lib._
  opts.fieldName = opts.fieldName ?? 'id'
  opts.fields = opts.fields ?? []
  return {
    properties: [{
      name: opts.fieldName,
      type: 'string',
      maxLength: 32,
      required: true,
      index: 'primary'
    }],
    hooks: [{
      name: 'beforeCreateRecord',
      level: 1000,
      handler: async function (body, options) {
        if (opts.fields.length === 0) opts.fields = omit(this.properties.map(prop => prop.name), [opts.fieldName])
        const item = {}
        for (const f of opts.fields) {
          item[f] = body[f]
        }
        body[opts.fieldName] = crypto.createHash('md5').update(JSON.stringify(item)).digest('hex')
      }
    }]
  }
}

export default unique
