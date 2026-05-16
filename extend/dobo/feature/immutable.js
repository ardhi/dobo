async function beforeRemoveRecord (id, opts, options) {
  const { get } = this.app.lib._
  if (get(options, 'req.user.interSiteAdmin')) return
  const record = await this.driver.getRecord(this, id)
  const immutable = get(record.data, opts.field)
  if (immutable) throw this.plugin.error('recordImmutable%s%s', id, this.name, { statusCode: 423 })
}

async function immutable (opts = {}) {
  opts.field = opts.field ?? '_immutable'
  return {
    properties: {
      name: opts.field,
      type: 'boolean'
    },
    hooks: [{
      name: 'beforeUpdateRecord',
      handler: async function (id, body, options) {
        await beforeRemoveRecord.call(this, id, opts, options)
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
