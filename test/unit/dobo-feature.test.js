/* global describe, it, beforeEach */

import { expect } from 'chai'
import featureFactory from '../../lib/factory/feature.js'
import { createAppStub } from './_stub.js'

describe('dobo feature class (unit)', () => {
  let app
  let plugin

  beforeEach(async () => {
    app = createAppStub('/tmp/dobo-feature')
    plugin = { app }
    await featureFactory.call(plugin)
  })

  it('creates DoboFeature and disposes cleanly', async () => {
    const feat = new app.baseClass.DoboFeature(plugin, { name: 'createdAt', handler: async () => ({}) })
    expect(feat.name).to.equal('createdAt')
    expect(feat.handler).to.be.a('function')
    await feat.dispose()
    expect(feat.name).to.equal(null)
    expect(feat.handler).to.equal(null)
  })
})
