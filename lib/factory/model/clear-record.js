import { getFilterAndOptions, execHook, execModelHook, execDynHook } from './helper.js'
const action = 'clearRecord'

/**
 * Clears all records from the model's underlying data store.
 *
 * If no arguments are provided, it automatically turns into a chainable {@link DoboAction} object.
 * @async
 * @memberof DoboModel
 * @method
 * @param  {DoboModel.TOptions} [opts={}] - Options object.
 * @returns {DoboAction|DoboModel.TResultRecord|DoboModel.TRecord}
 */
async function clearRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const [opts = {}] = args
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  await execHook.call(this, 'beforeClearRecord', options)
  await execModelHook.call(this, 'beforeClearRecord', options)
  await execDynHook.call(this, 'beforeClearRecord', options)
  const result = (await this.adapter._clearRecord(this, options)) ?? {}
  await execDynHook.call(this, 'afterClearRecord', result, options)
  await execModelHook.call(this, 'afterClearRecord', result, options)
  await execHook.call(this, 'afterClearRecord', result, options)
  return dataOnly ? result.data : result
}

export default clearRecord
