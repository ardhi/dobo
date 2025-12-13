import resolveMethod from '../../lib/resolve-method.js'

/**
 * Create a new model:
 * - read corresponding schema
 * - attempt to create table/database/collection accordingly
 *
 * @method
 * @memberof Dobo
 * @async
 * @instance
 * @name modelCreate
 * @param {string} name - Model's name
 * @param {Object} [options={}] - Options object
 */
async function create (name, options = {}) {
  const { runHook } = this.app.bajo
  const { camelCase } = this.app.lib._

  const { handler, schema, driver } = await resolveMethod.call(this, name, 'model-create', options)
  if (!options.noHook) {
    await runHook(`${this.ns}:beforeModelCreate`, schema, options)
    await runHook(`${this.ns}.${camelCase(name)}:beforeModelCreate`, options)
  }
  await handler.call(this.app[driver.ns], { schema, options })
  if (!options.noHook) {
    await runHook(`${this.ns}.${camelCase(name)}:afterModelCreate`, options)
    await runHook(`${this.ns}:afterModelCreate`, schema, options)
  }
}

export default create
