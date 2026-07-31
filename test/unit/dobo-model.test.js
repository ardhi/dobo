/* global describe, it, beforeEach */

import { expect } from 'chai'
import modelFactory from '../../lib/factory/model.js'
import { createAppStub, Base } from './_stub.js'

describe('dobo model class (unit)', () => {
  let app
  let plugin
  let model

  beforeEach(async () => {
    app = createAppStub('/tmp/dobo-model-unit')
    app.dobo = {
      models: [],
      sanitizeDate: (v) => v,
      sanitizeByType: (v) => v,
      checkAggregateParams: () => {},
      checkHistogramParams: () => {},
      runModelHook: async () => {},
      parseQuery: (q) => q
    }
    app.baseClass.DoboAction = class DoboAction {
      constructor (m, name, ...args) {
        this.model = m
        this.name = name
        this.args = args
      }
    }

    plugin = new Base('dobo', app)
    await modelFactory.call(plugin)

    const options = {
      name: 'Order',
      baseName: 'order',
      connection: {
        name: 'default',
        adapter: { idField: { name: '_id', type: 'string', maxLength: 50 } }
      },
      properties: [
        { name: 'id', type: 'string', maxLength: 50 },
        { name: 'title', type: 'string', maxLength: 50 },
        { name: 'total', type: 'double' },
        { name: 'virtualTitle', type: 'string', virtual: true }
      ],
      indexes: [{ name: 'idx_title', type: 'index', fields: ['title'] }],
      hooks: []
    }
    model = new app.baseClass.DoboModel(plugin, options)
    app.dobo.models.push(model)
  })

  it('builds aliases, action and property getters correctly', () => {
    const act = model.action('getRecord', 'id-1')
    expect(act.name).to.equal('getRecord')
    expect(model.getProperty('title').type).to.equal('string')
    expect(model.getField('title').name).to.equal('title')
    expect(model.hasProperty('title')).to.equal(true)
    expect(model.hasField('ghost')).to.equal(false)
    expect(model.getIndexes()).to.have.length(1)
  })

  it('returns filtered property lists (all, virtual, non-virtual)', () => {
    expect(model.getProperties().length).to.equal(4)
    expect(model.getProperties({ noVirtual: true }).length).to.equal(3)
    expect(model.getProperties({ noVirtual: true, namesOnly: true })).to.include('title')
    expect(model.getVirtualProperties(true)).to.deep.equal(['virtualTitle'])
    expect(model.getNonVirtualProperties(true)).to.include('id')
  })

  it('sanitizes and syncs id field', () => {
    model.properties[0].type = 'integer'
    expect(model.sanitizeId('12')).to.equal(12)

    model.syncIdField({ name: 'id', type: 'string', maxLength: 20 })
    expect(model.properties[0].maxLength).to.equal(20)
  })

  it('buildPropValues supports array and req translation hooks', async () => {
    const prop = {
      name: 'status',
      values: ['draft', { value: 'done', text: 'done' }]
    }
    const req = {
      te: (k) => k === 'statusDone',
      t: () => 'Selesai'
    }
    const vals = await model.buildPropValues(prop, { req })
    expect(vals).to.have.length(2)
    expect(vals[1].text).to.equal('Selesai')
  })

  it('_simpleLookup handles string/object/array definitions', async () => {
    const userModel = {
      findOneRecord: async () => ({ id: 'u1', username: 'john' })
    }
    app.dobo.getModel = () => userModel

    const a = await model._simpleLookup('User:username:id=u1', {})
    expect(a).to.equal('john')

    const b = await model._simpleLookup({ model: 'User', field: 'id', query: 'id={id}' }, { id: 'u9' })
    expect(b).to.equal('u1')

    const c = await model._simpleLookup(['User', 'id', 'id=u5'], {})
    expect(c).to.equal('u1')
  })

  it('dispose clears connection and adapter references', async () => {
    await model.dispose()
    expect(model.connection).to.equal(null)
    expect(model.adapter).to.equal(null)
  })
})
