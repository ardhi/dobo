import { getFilterAndOptions, execHook, execModelHook } from './helper.js'
const action = 'modelExists'

/**
 * Checks if the model exists in the underlying data store.
 * @async
 * @memberof DoboModel
 * @method
 * @param  {DoboModel.TOptions} [opts] - Options object.
 * @returns {DoboAction|DoboModel.TResult|boolean}
 * @see {@link module:Hook.beforeModelExists}
 * @see {@link module:Hook.afterModelExists}
 */
async function isExists (opts = {}) {
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  await execHook.call(this, 'beforeModelExists', options)
  await execModelHook.call(this, 'beforeModelExists', options)
  const result = (await this.adapter._modelExists(this, options)) ?? {}
  await execModelHook.call(this, 'afterModelExists', result, options)
  await execHook.call(this, 'afterModelExists', result, options)
  return dataOnly ? result.data : result
}

export default isExists
