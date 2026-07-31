/* global describe, it, beforeEach */

import { expect } from 'chai'
import factory from '../../index.js'
import { createAppStub } from '../unit/_stub.js'

describe('integration aspect 01 - start connections', () => {
  let dobo

  beforeEach(async () => {
    const app = createAppStub('/tmp/dobo-int-01')
    const Dobo = await factory.call({ app }, 'dobo')
    dobo = new Dobo()
  })

  it('starts all, single, and selected connections', async () => {
    const calls = []
    const c1 = { name: 'primary', connect: async () => calls.push('primary'), adapter: { plugin: { ns: 'dobo' }, name: 'memory' } }
    const c2 = { name: 'audit', connect: async () => calls.push('audit'), adapter: { plugin: { ns: 'dobo' }, name: 'memory' } }
    dobo.connections = [c1, c2]

    await dobo.start('all')
    expect(calls).to.deep.equal(['primary', 'audit'])

    calls.length = 0
    await dobo.start('audit')
    expect(calls).to.deep.equal(['audit'])

    calls.length = 0
    await dobo.start(['primary'])
    expect(calls).to.deep.equal(['primary'])
  })
})
