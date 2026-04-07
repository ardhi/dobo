async function beforeFindRecord ({ filter = {} }, opts) {
  filter.query = filter.query ?? {}
  const { isEmpty, set } = this.app.lib._
  const q = { $and: [] }
  if (!isEmpty(filter.query)) {
    if (filter.query.$and) q.$and.push(...filter.query.$and)
    else q.$and.push(filter.query)
  }
  q.$and.push(set({}, opts.field, null))
  filter.query = q
}

async function afterGetRecord ({ id, record = {} }, opts) {
  const { isEmpty } = this.app.lib._
  if (!isEmpty(record.data[opts.field])) throw this.error('recordNotFound%s%s', id, this.name, { statusCode: 404 })
}

async function beforeCreateRecord ({ body = {} }, opts) {
  delete body[opts.field]
}

async function removedAt (opts = {}) {
  opts.field = opts.field ?? '_removedAt'
  return {
    properties: {
      name: opts.field,
      type: 'datetime',
      index: true,
      hidden: true
    },
    hooks: [{
      name: 'beforeFindRecord',
      handler: async function (filter, options) {
        await beforeFindRecord.call(this, { filter, options }, opts)
      }
    }, {
      name: 'afterGetRecord',
      handler: async function (id, record, options) {
        await afterGetRecord.call(this, { record }, opts)
      }
    }, {
      name: 'beforeCreateRecord',
      handler: async function (body, options) {
        await beforeCreateRecord.call(this, { body }, opts)
      }
    }, {
      name: 'beforeUpdateRecord',
      handler: async function (id, body, options) {
        await beforeCreateRecord.call(this, { body }, opts)
      }
    }, {
      name: 'beforeRemoveRecord',
      handler: async function (id, options) {
        const { set } = this.app.lib._
        const body = set({}, opts.field, new Date())
        const record = await this.driver.recordUpdate(this, id, body, { noResult: false })
        options.record = { oldData: record.oldData }
      }
    }]
  }
}

export default removedAt
