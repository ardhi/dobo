/* global describe, it, beforeEach */

import { expect } from 'chai'
import factory from '../../index.js'
import { createAppStub } from './_stub.js'

describe('dobo core class (unit)', () => {
  let app
  let Dobo
  let dobo

  beforeEach(async () => {
    app = createAppStub('/tmp/dobo-unit')
    Dobo = await factory.call({ app }, 'dobo')
    dobo = new Dobo()
  })

  it('creates plugin class with expected static values and defaults', () => {
    expect(Dobo.aggregateTypes).to.include('count')
    expect(Dobo.histogramTypes).to.include('yearly')
    expect(Dobo.idTypes).to.include('string')
    expect(dobo.config.default.filter.limit).to.equal(25)
    expect(dobo.adapters).to.deep.equal([])
    expect(dobo.connections).to.deep.equal([])
    expect(dobo.features).to.deep.equal([])
    expect(dobo.models).to.deep.equal([])
  })

  it('property key helpers include type-specific fields', () => {
    expect(dobo.getPropertyKeysByType('string')).to.include('maxLength')
    expect(dobo.getPropertyKeysByType('text')).to.include('textType')
    expect(dobo.getPropertyKeysByType('smallint')).to.include('autoInc')

    const keys = dobo.getAllPropertyKeys({ constructor: { propertyKeys: ['xFlag'] } })
    expect(keys).to.include('name')
    expect(keys).to.include('validator')
    expect(keys).to.include('xFlag')
  })

  it('connection, adapter, feature and model lookups work', () => {
    dobo.connections = [{ name: 'default' }, { name: 'report' }]
    expect(dobo.getConnection('report').name).to.equal('report')
    expect(dobo.getConnection('none', true)).to.equal(undefined)

    dobo.adapters = [
      { name: 'memory', plugin: { ns: 'dobo' } },
      { name: 'proxy', plugin: { ns: 'ext' } }
    ]
    expect(dobo.getAdapter('memory').name).to.equal('memory')
    expect(dobo.getAdapter('ext:proxy').name).to.equal('proxy')
    expect(dobo.getAdapter('missing', true)).to.equal(undefined)

    dobo.features = [{ name: 'createdAt', plugin: { ns: 'dobo' } }]
    expect(dobo.getFeature('createdAt').name).to.equal('createdAt')

    dobo.models = [{ name: 'Order' }, { name: 'Customer' }]
    expect(dobo.getModel('Order').name).to.equal('Order')
    expect(dobo.getModel('order').name).to.equal('Order')
    expect(dobo.getModel('none', true)).to.equal(undefined)
  })

  it('sanitize helpers and aggregate calculators work', () => {
    expect(dobo.sanitizeBoolean('true')).to.equal(true)
    expect(dobo.sanitizeBoolean(false)).to.equal(false)
    expect(dobo.sanitizeFloat('12.4')).to.equal(12.4)
    expect(dobo.sanitizeInt('12')).to.equal(12)
    expect(dobo.sanitizeString(44)).to.equal('44')
    expect(dobo.sanitizeObject('{"a":1}')).to.deep.equal({ a: 1 })

    const rows = [
      { grp: 'a', price: 10 },
      { grp: 'a', price: 30 },
      { grp: 'b', price: 20 }
    ]
    const agg = dobo.calcAggregate({ data: rows, group: 'grp', field: 'price', aggregates: ['count', 'avg', 'min', 'max'] })
    expect(agg).to.have.length(2)
    const itemA = agg.find(i => i.grp === 'a')
    expect(itemA.count).to.equal(2)
    expect(itemA.max).to.equal(30)
  })

  it('histogram and query parsers work with valid input', () => {
    const rows = [
      { createdAt: '2026-01-01T00:00:00Z', score: 5 },
      { createdAt: '2026-01-01T12:00:00Z', score: 7 },
      { createdAt: '2026-01-02T00:00:00Z', score: 10 }
    ]
    const hist = dobo.calcHistogram({ data: rows, type: 'daily', group: 'createdAt', field: 'score', aggregates: ['count'] })
    expect(hist).to.have.length(2)
    expect(hist[0]).to.have.property('date')

    const model = {
      scanables: ['name'],
      sortables: ['name'],
      properties: [{ name: 'name', type: 'string' }],
      adapter: { idField: { name: '_id' } }
    }
    const parsed = dobo.parseQuery('name:~\'john\'', model)
    expect(parsed).to.be.an('object')

    const parsedAny = dobo.parseQuery('john*', model)
    expect(parsedAny).to.be.an('object')
  })

  it('regex json helpers and model hooks work', async () => {
    const input = { n: /abc/gi }
    const text = dobo.replaceRegexInJson(input, true)
    const revived = dobo.reviveRegexInJson(text, true)
    expect(revived.n).to.be.instanceOf(RegExp)
    expect(revived.n.flags).to.include('g')

    const calls = []
    const model = {
      hooks: [
        { name: 'beforeCreateRecord', level: 2, handler: async () => calls.push(2) },
        { name: 'beforeCreateRecord', level: 1, handler: async () => calls.push(1) }
      ]
    }
    await dobo.runModelHook(model, 'beforeCreateRecord', {})
    expect(calls).to.deep.equal([1, 2])
  })

  it('default values and hard-cap last page handler work', () => {
    dobo.config.default.filter = { limit: 10, maxLimit: 50, maxPage: 30, sort: [] }
    dobo.config.default.hardCap = 100
    dobo.config.default.warnings = true

    const def = dobo.getDefaultValues()
    expect(def.limit).to.equal(10)
    expect(def.hardCap).to.equal(100)

    const result = dobo.handleLastPage({ count: 300, limit: 10, page: 25 })
    expect(result.count).to.equal(100)
    expect(result.data).to.deep.equal([])
  })
})
