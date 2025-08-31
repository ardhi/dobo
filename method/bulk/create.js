import buildBulkAction from '../../lib/build-bulk-action.js'
import execValidation from '../../lib/exec-validation.js'
import execFeatureHook from '../../lib/exec-feature-hook.js'

async function create (name, inputs, options) {
  const { isSet } = this.app.lib.aneka
  const { generateId, runHook } = this.app.bajo
  const { clearModel } = this.cache ?? {}
  const { find } = this.app.lib._
  options.dataOnly = options.dataOnly ?? true
  options.truncateString = options.truncateString ?? true
  const { noHook, noValidation } = options
  await this.modelExists(name, true)
  const { handler, schema } = await buildBulkAction.call(this, name, 'create', options)
  const idField = find(schema.properties, { name: 'id' })
  const bodies = [...inputs]
  for (let b of bodies) {
    b.id = b.id ?? generateId(idField.type === 'integer' ? 'int' : undefined)
    b = await this.sanitizeBody({ body: b, schema, strict: true })
    if (!noValidation) b = await execValidation.call(this, { noHook, name, b, options })
  }
  if (!noHook) {
    await runHook(`${this.name}:beforeBulkCreate`, name, bodies, options)
    await runHook(`${this.name}.${name}:beforeBulkCreate`, bodies, options)
  }
  for (const idx in bodies) {
    await execFeatureHook.call(this, 'beforeCreate', { schema, body: bodies[idx] })
    // TODO: check unique?
    for (const k in bodies[idx]) {
      if (bodies[idx][k] === undefined) continue
      const prop = find(schema.properties, { name: k })
      if (options.truncateString && isSet(bodies[idx][k]) && prop && ['string', 'text'].includes(prop.type)) bodies[idx][k] = bodies[idx][k].slice(0, prop.maxLength)
    }
  }
  await handler.call(this, { schema, bodies, options })
  for (const idx in bodies) {
    await execFeatureHook.call(this, 'afterCreate', { schema, body: bodies[idx] })
  }
  if (!noHook) {
    await runHook(`${this.name}.${name}:afterBulkCreate`, bodies, options)
    await runHook(`${this.name}:afterBulkCreate`, name, bodies, options)
  }
  if (clearModel) await clearModel({ model: name })
}

export default create
