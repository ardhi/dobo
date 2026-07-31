/* global describe, it, beforeEach */

import { expect } from 'chai'
import adapterFactory from '../../lib/factory/adapter.js'
import modelFactory from '../../lib/factory/model.js'
import { createAppStub, Base } from '../unit/_stub.js'

describe('integration aspect 03 - model adapter flow', () => {
  let app
  let plugin
  let model
  let adapter
  const store = {}

  beforeEach(async () => {
    app = createAppStub('/tmp/dobo-int-03')
    app.bajo.runHook = async () => {}
    app.dobo = {
      ns: 'dobo',
      t: (x) => x,
      error: (msg, payload) => {
        const err = new Error(msg)
        err.payload = payload
        return err
      },
      getDefaultValues: () => ({ warnings: true }),
      checkAggregateParams: () => {},
      checkHistogramParams: () => {}
    }

    plugin = new Base('dobo', app)
    plugin.error = (msg, ...args) => new Error(`${msg}:${args.join(',')}`)
    await adapterFactory.call(plugin)
    await modelFactory.call(plugin)

    adapter = new app.baseClass.DoboAdapter(plugin, 'memory')
    const conn = { name: 'default', adapter }

    model = new app.baseClass.DoboModel(plugin, {
      name: 'Order',
      connection: conn,
      properties: [
        { name: 'id', type: 'string', maxLength: 50 },
        { name: 'name', type: 'string' },
        { name: 'amount', type: 'double' },
        { name: 'createdAt', type: 'datetime' }
      ],
      indexes: [{ name: 'uidx_id', type: 'unique', fields: ['id'] }],
      hooks: []
    })

    adapter.getRecord = async (m, id) => ({ data: store[id] ? { ...store[id] } : null })
    adapter.createRecord = async (m, body) => {
      const key = body._id ?? body.id
      store[key] = { ...body }
      return { data: { ...body } }
    }
    adapter.updateRecord = async (m, id, body) => {
      const oldData = { ...(store[id] ?? {}) }
      store[id] = { ...(store[id] ?? {}), ...body }
      return { oldData, data: { ...store[id] } }
    }
    adapter.findRecord = async () => ({ data: Object.values(store), count: Object.keys(store).length })
    adapter.removeRecord = async (m, id) => {
      const oldData = store[id] ? { ...store[id] } : null
      delete store[id]
      return { oldData }
    }
    adapter.clearRecord = async () => {
      for (const k in store) delete store[k]
      return { data: true }
    }
  })

  it('executes create/find/update/remove lifecycle through adapter wrappers', async () => {
    const c = await adapter._createRecord(model, { id: 'o1', name: 'book', amount: 10 }, { noUniqueCheck: true, noIdCheck: true })
    expect(c.data.id).to.equal('o1')

    const f = await adapter._findRecord(model, {}, {})
    expect(f.count).to.equal(1)

    const u = await adapter._updateRecord(model, 'o1', { amount: 15 }, { _data: { ...store.o1 } })
    expect(u.data.amount).to.equal(15)

    const r = await adapter._removeRecord(model, 'o1', { _data: { ...store.o1 } })
    expect(r.oldData.id).to.equal('o1')
  })
})
