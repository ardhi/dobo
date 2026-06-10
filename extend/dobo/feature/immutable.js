async function beforeRemoveRecord (id, opts, options) {
  const { get } = this.app.lib._
  if (get(options, 'req.user.isXSiteAdmin')) return
  const record = await this.driver.getRecord(this, id)
  const immutable = get(record.data, opts.field)
  if (immutable.length === 1 && immutable[0] === '*') throw this.plugin.error('recordImmutable%s%s', id, this.name, { statusCode: 423 })
}

async function beforeUpdateRecord (id, body, opts, options) {
  const { get } = this.app.lib._
  if (get(options, 'req.user.isXSiteAdmin')) return
  const record = await this.driver.getRecord(this, id)
  const immutable = get(record.data, opts.field)
  if (immutable.length === 0) return
  const fields = []
  if (immutable.length === 1 && immutable[0] === '*') fields.push(...this.getNonVirtualProperties(true))
  for (const field of fields) {
    delete body[field]
  }
}

async function immutable (opts = {}) {
  opts.field = opts.field ?? '_immutable'
  return {
    properties: {
      name: opts.field,
      type: 'array',
      default: []
    },
    hooks: [{
      name: 'beforeUpdateRecord',
      handler: async function (id, body, options) {
        await beforeUpdateRecord.call(this, id, body, opts, options)
      }
    }, {
      name: 'beforeRemoveRecord',
      handler: async function (id, options) {
        await beforeRemoveRecord.call(this, id, opts, options)
      }
    }]
  }
}

export default immutable
