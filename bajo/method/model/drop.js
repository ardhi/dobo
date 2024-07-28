import resolveMethod from '../../../lib/resolve-method.js'

async function drop (name, options = {}) {
  const { runHook } = this.app.bajo
  const { handler, schema } = await resolveMethod.call(this, name, 'model-drop', options)
  await runHook(`${this.name}:beforeCollDrop` + name, schema)
  await handler.call(this, { schema, options })
  await runHook(`${this.name}:afterCollDrop` + name, schema)
}

export default drop
