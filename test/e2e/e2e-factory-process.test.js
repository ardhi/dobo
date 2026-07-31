/* global describe, it */

import { expect } from 'chai'
import { runNodeInline } from './_run.js'

describe('e2e factory process', () => {
  it('builds dobo class and executes runtime methods in separate process', async function () {
    this.timeout(10000)

    const code = `
import factory from './index.js'
import { createAppStub } from './test/unit/_stub.js'
const app = createAppStub('/tmp/dobo-e2e')
const Dobo = await factory.call({ app }, 'dobo')
const dobo = new Dobo()
const rows = [{ g: 'a', n: 1 }, { g: 'a', n: 3 }]
const agg = dobo.calcAggregate({ data: rows, group: 'g', field: 'n', aggregates: ['count', 'avg'] })
console.log('E2E_OK:' + (Array.isArray(agg) && agg.length === 1 && agg[0].count === 2))
`

    const res = await runNodeInline(code, '/mnt/d/Projects/Dobo/dobo')
    expect(res.code).to.equal(0)
    expect(res.stdout).to.include('E2E_OK:true')
  })
})
