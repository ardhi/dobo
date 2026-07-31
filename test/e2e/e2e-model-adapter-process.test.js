/* global describe, it */

import { expect } from 'chai'
import { runNodeInline } from './_run.js'

describe('e2e model-adapter process', () => {
  it('creates model and adapter classes and runs wrapper calls in separate process', async function () {
    this.timeout(12000)

    const code = `
import adapterFactory from './lib/factory/adapter.js'
import modelFactory from './lib/factory/model.js'
import { createAppStub, Base } from './test/unit/_stub.js'

const app = createAppStub('/tmp/dobo-e2e-model-adapter')
app.bajo.runHook = async () => {}
app.dobo = {
  ns: 'dobo',
  t: (x) => x,
  error: (m) => new Error(m),
  checkAggregateParams: () => {},
  checkHistogramParams: () => {}
}

const plugin = new Base('dobo', app)
plugin.error = (m) => new Error(m)
await adapterFactory.call(plugin)
await modelFactory.call(plugin)

const adapter = new app.baseClass.DoboAdapter(plugin, 'memory')
const conn = { name: 'default', adapter }
const model = new app.baseClass.DoboModel(plugin, {
  name: 'Order',
  connection: conn,
  properties: [{ name: 'id', type: 'string', maxLength: 50 }, { name: 'name', type: 'string' }],
  indexes: [{ name: 'uidx_id', type: 'unique', fields: ['id'] }],
  hooks: []
})

adapter.createRecord = async (m, body) => ({ data: { ...body } })
adapter.getRecord = async (m, id) => ({ data: { _id: id, name: 'x' } })

const created = await adapter._createRecord(model, { id: 'e1', name: 'ok' }, { noUniqueCheck: true, noIdCheck: true })
const got = await adapter._getRecord(model, 'e1', {})
console.log('E2E_MODEL_ADAPTER_OK:' + (created.data.id === 'e1' && got.data.id === 'e1'))
`

    const res = await runNodeInline(code, '/mnt/d/Projects/Dobo/dobo')
    expect(res.code).to.equal(0)
    expect(res.stdout).to.include('E2E_MODEL_ADAPTER_OK:true')
  })
})
