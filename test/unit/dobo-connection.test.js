/* global describe, it, beforeEach */

import { expect } from 'chai'
import connectionFactory from '../../lib/factory/connection.js'
import { createAppStub } from './_stub.js'

describe('dobo connection class (unit)', () => {
  let app
  let plugin

  beforeEach(async () => {
    app = createAppStub('/tmp/dobo-connection')
    app.baseClass.DoboNullAdapter = class DoboNullAdapter {}
    app.baseClass.DoboAdapter = class DoboAdapter {}
    plugin = {
      app,
      getAdapter: () => ({ sanitizeConnection: async () => {}, connect: async () => ({ client: true }) })
    }
    await connectionFactory.call(plugin)
  })

  it('creates DoboConnection, initializes adapter and connects', async () => {
    const conn = new app.baseClass.DoboConnection(plugin, { name: 'default', adapter: 'dobo:memory', models: ['User'] })
    await conn.initAdapter('dobo:memory')
    expect(conn.adapter).to.be.an('object')
    await conn.connect(true)
    expect(conn.connected).to.equal(true)
    expect(conn.client).to.deep.equal({ client: true })
  })

  it('dispose clears adapter reference', async () => {
    const conn = new app.baseClass.DoboConnection(plugin, { name: 'default', adapter: 'dobo:memory' })
    conn.adapter = { ok: true }
    await conn.dispose()
    expect(conn.adapter).to.equal(null)
  })
})
