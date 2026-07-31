/* global describe, it, beforeEach */

import { expect } from 'chai'
import factory from '../../index.js'
import { sanitizeRef } from '../../lib/helper.js'
import { createAppStub } from './_stub.js'

describe('helper sanitizeRef (unit)', () => {
  let app
  let dobo

  beforeEach(async () => {
    app = createAppStub('/tmp/dobo-helper-ref')
    const Dobo = await factory.call({ app }, 'dobo')
    dobo = new Dobo()
    app.dobo = dobo
    dobo.fatal = (msg, ...args) => { throw new Error(`${msg}:${args.join(',')}`) }
  })

  it('normalizes reference fields and filters unknown refs', async () => {
    const user = {
      name: 'User',
      properties: [{ name: 'id' }, { name: 'name' }]
    }
    const order = {
      name: 'Order',
      properties: [
        {
          name: 'userId',
          ref: {
            user: { model: 'User', field: 'id', fields: ['name'] },
            missing: { model: 'Unknown', field: 'id' }
          }
        }
      ]
    }

    await sanitizeRef.call(dobo, order, [user, order])

    expect(order.properties[0].ref.user.type).to.equal('1:1')
    expect(order.properties[0].ref.user.searchField).to.equal('id')
    expect(order.properties[0].ref.user.labelField).to.equal('id')
    expect(order.properties[0].ref.user.fields).to.include('id')
    expect(order.properties[0].ref.missing).to.equal(undefined)
  })

  it('throws when duplicate ref keys exist across properties', async () => {
    const schema = {
      name: 'Order',
      properties: [
        { name: 'a', ref: { rel: { model: 'User' } } },
        { name: 'b', ref: { rel: { model: 'User' } } }
      ]
    }
    const user = { name: 'User', properties: [{ name: 'id' }] }

    let err
    try {
      await sanitizeRef.call(dobo, schema, [schema, user])
    } catch (e) { err = e }
    expect(err).to.be.instanceOf(Error)
    expect(err.message).to.include('duplicateRefKeys')
  })
})
