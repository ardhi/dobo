/* global describe, it, beforeEach */

import { expect } from 'chai'
import factory from '../../index.js'
import { createAppStub } from '../unit/_stub.js'

describe('integration aspect 02 - query and regex', () => {
  let dobo

  beforeEach(async () => {
    const app = createAppStub('/tmp/dobo-int-02')
    const Dobo = await factory.call({ app }, 'dobo')
    dobo = new Dobo()
  })

  it('parses query text and preserves regex via json conversion', () => {
    const model = {
      scanables: ['title'],
      sortables: ['title'],
      properties: [{ name: 'title', type: 'string' }],
      adapter: { idField: { name: '_id' } }
    }

    const q1 = dobo.parseQuery('title:~\'book\'', model)
    expect(q1).to.be.an('object')

    const q2 = dobo.parseQuery('{"id":"x"}', model)
    expect(q2._id).to.equal('x')

    const str = dobo.replaceRegexInJson({ title: /book/i })
    const obj = dobo.reviveRegexInJson(str)
    expect(obj.title).to.be.instanceOf(RegExp)
  })
})
