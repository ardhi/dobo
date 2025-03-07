async function beforeFind ({ filter = {}, options }, opts) {
  filter.query = filter.query ?? {}
  const { isEmpty, set } = this.app.bajo.lib._
  const q = { $and: [] }
  if (!isEmpty(filter.query)) {
    if (filter.query.$and) q.$and.push(...filter.query.$and)
    else q.$and.push(filter.query)
  }
  q.$and.push(set({}, opts.fieldName, null))
  filter.query = q
}

async function afterFind ({ records }, opts) {
  for (const rec of records.data) {
    delete rec[opts.fieldName]
  }
}

async function afterGet ({ schema, id, record }, opts) {
  const { isEmpty } = this.app.bajo.lib._
  if (!isEmpty(record.data[opts.fieldName])) throw this.error('recordNotFound%s%s', id, schema.name, { statusCode: 404 })
  delete record.data[opts.fieldName]
}

async function beforeCreate ({ body }, opts) {
  delete body[opts.fieldName]
}

async function afterCreate ({ record }, opts) {
  delete record.data[opts.fieldName]
  if (record.oldData) delete record.oldData[opts.fieldName]
}

async function removedAt (opts = {}) {
  opts.fieldName = opts.fieldName ?? 'removedAt'
  return {
    properties: {
      name: opts.fieldName,
      type: 'datetime',
      index: true
    },
    hook: {
      beforeFind: async function ({ filter, options }) {
        await beforeFind.call(this, { filter, options }, opts)
      },
      beforeFindOne: async function ({ filter, options }) {
        await beforeFind.call(this, { filter, options }, opts)
      },
      afterFind: async function ({ records }) {
        await afterFind.call(this, { records }, opts)
      },
      afterFindOne: async function ({ record }) {
        await afterGet.call(this, { record }, opts)
      },
      afterGet: async function ({ record }) {
        await afterGet.call(this, { record }, opts)
      },
      beforeCreate: async function ({ body }) {
        await beforeCreate.call(this, { body }, opts)
      },
      afterCreate: async function ({ record }) {
        await afterCreate.call(this, { record }, opts)
      },
      beforeUpdate: async function ({ schema, id, body, options }) {
        await beforeCreate.call(this, { body }, opts)
      },
      afterUpdate: async function ({ record }) {
        await afterCreate.call(this, { record }, opts)
      },
      beforeRemove: async function ({ schema, id, options }) {
        const { recordUpdate, recordGet } = this.app.dobo
        await recordGet(schema.name, id, options)
        const { set } = this.app.bajo.lib._
        const body = set({}, opts.fieldName, new Date())
        const record = await recordUpdate(schema.name, id, body, { dataOnly: false, noValidation: true, noFeatureHook: true })
        options.record = { oldData: record.oldData }
      },
      afterRemove: async function ({ record }) {
        delete record.oldData[opts.fieldName]
      }
    }
  }
}

export default removedAt
