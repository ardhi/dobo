/* global describe, it, beforeEach */

import { expect } from 'chai'
import actionFactory from '../../lib/factory/action.js'
import { createAppStub } from './_stub.js'

describe('dobo action class (unit)', () => {
  let app
  let plugin

  beforeEach(async () => {
    app = createAppStub('/tmp/dobo-action')
    plugin = { app }
    await actionFactory.call(plugin)
  })

  it('creates chainable action class and runs model handlers', async () => {
    const calls = []
    const model = {
      plugin,
      getRecord: async (...args) => {
        calls.push(args)
        return { ok: true }
      }
    }

    const action = new app.baseClass.DoboAction(model, 'getRecord', 'abc')
    const resp = await action
      .noHook()
      .dataOnly(false)
      .run({ noCache: false })

    expect(resp.ok).to.equal(true)
    expect(calls).to.have.length(1)
    expect(calls[0][0]).to.equal('abc')
    expect(calls[0][1]).to.be.an('object')
  })

  it('builder methods for create/update payload set expected positional args', async () => {
    const model = {
      plugin,
      updateRecord: async (id, body, options) => ({ id, body, options })
    }

    const action = new app.baseClass.DoboAction(model)
    const result = await action.updateRecord('id-1', { name: 'A' }).run()
    expect(result.id).to.equal('id-1')
    expect(result.body.name).to.equal('A')
  })

  it('dispose clears action references', async () => {
    const model = { plugin, getRecord: async () => ({}) }
    const action = new app.baseClass.DoboAction(model, 'getRecord', 'x')
    await action.dispose()
    expect(action.model).to.equal(null)
    expect(action._options).to.equal(null)
  })
})
