/* global describe, it, beforeEach */

import { expect } from 'chai'
import factory from '../../index.js'
import { sanitizeAll } from '../../lib/helper.js'
import { createAppStub } from './_stub.js'

describe('helper sanitizeAll (unit)', () => {
  let app
  let dobo

  beforeEach(async () => {
    app = createAppStub('/tmp/dobo-helper-all')
    const Dobo = await factory.call({ app }, 'dobo')
    dobo = new Dobo()
    app.dobo = dobo
    dobo.fatal = (msg, ...args) => { throw new Error(`${msg}:${args.join(',')}`) }
  })

  it('normalizes properties, indexes, sortables and hidden fields', async () => {
    const schema = {
      name: 'Order',
      properties: [
        { name: 'id', type: 'string', index: 'primary' },
        { name: 'name', type: 'string', minLength: '0', maxLength: '20' },
        { name: 'amount', type: 'double' }
      ],
      indexes: [{ name: 'idx_name', type: 'index', fields: ['name'] }],
      hidden: ['name', 'ghost']
    }

    await sanitizeAll.call(dobo, schema)

    expect(schema.sortables).to.include('name')
    expect(schema.hidden).to.deep.equal(['name'])
    const nameProp = schema.properties.find(p => p.name === 'name')
    expect(nameProp.maxLength).to.equal(20)
    expect(nameProp.minLength).to.equal(undefined)
  })
})
