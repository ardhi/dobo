import { getFilterAndOptions, execHook, execModelHook } from './helper.js'
const action = 'drop'

/**
 * Drops the model from the underlying data store.
 * @async
 * @memberof DoboModel
 * @method
 * @param  {DoboModel.TOptions} [opts] - Options object.
 * @returns {DoboAction|DoboModel.TResult|boolean}
 * @see {@link DoboModel.THookBeforeDropModel}
 * @see {@link DoboModel.THookAfterDropModel}
 */
async function drop (opts = {}) {
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  await execHook.call(this, 'beforeDropModel', options)
  await execModelHook.call(this, 'beforeDropModel', options)
  const result = (await this.adapter._dropModel(this, options)) ?? {}
  await execModelHook.call(this, 'afterDropModel', result, options)
  await execHook.call(this, 'afterModelDrop', result, options)
  return dataOnly ? result.data : result
}

export default drop
