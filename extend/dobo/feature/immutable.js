async function beforeRemoveRecord (id, opts) {
  const { get } = this.app.lib._
  const record = await this.driver.getRecord(this, id)
  const immutable = get(record.data, opts.fieldName)
  if (immutable) throw this.plugin.error('recordImmutable%s%s', id, this.name, { statusCode: 423 })
}

async function immutable (opts = {}) {
  opts.fieldName = opts.fieldName ?? '_immutable'
  return {
    properties: {
      name: opts.fieldName,
      type: 'boolean',
      hidden: true
    },
    hooks: [{
      name: 'beforeUpdateRecord',
      handler: async function (id, body, options) {
        await beforeRemoveRecord.call(this, id, opts)
      }
    }, {
      name: 'beforeRemoveRecord',
      handler: async function (id, options) {
        await beforeRemoveRecord.call(this, id, opts)
      }
    }]
  }
}

export default immutable
