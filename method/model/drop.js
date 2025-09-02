import resolveMethod from '../../lib/resolve-method.js'

/**
 * Drop database model
 *
 * @method
 * @memberof Dobo
 * @async
 * @instance
 * @name modelDrop
 * @param {string} name - Model's name
 * @param {Object} [options={}] - Options object
 */

async function drop (name, options = {}) {
  const { runHook } = this.app.bajo
  const { camelCase } = this.app.lib._
  const { handler, schema, driver } = await resolveMethod.call(this, name, 'model-drop', options)

  if (!options.noHook) {
    await runHook(`${this.ns}:beforeModelDrop`, schema, options)
    await runHook(`${this.ns}.${camelCase(name)}:beforeModelDrop`, options)
  }
  await handler.call(this.app[driver.ns], { schema, options })
  if (!options.noHook) {
    await runHook(`${this.ns}.${camelCase(name)}:afterModelDrop`, options)
    await runHook(`${this.ns}:afterModelDrop`, schema, options)
  }
}

export default drop
