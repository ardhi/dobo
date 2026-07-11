import { getFilterAndOptions, execHook, execModelHook, execDynHook, getRefs, handleReq, clearCache } from './helper.js'
const action = 'removeRecord'

/**
 * Removes a record from the model's underlying data store based on the provided ID.
 *
 * If no arguments are provided, it automatically turns into a chainable {@link DoboAction} object.
 * @async
 * @memberof DoboModel
 * @method
 * @param  {string|number} id - The ID of the record to be removed.
 * @param  {DoboModel.TOptions} [opts={}] - Options object.
 * @see {@link DoboModel.THookBeforeRemoveRecord}
 * @see {@link DoboModel.THookAfterRemoveRecord}
 * @returns {DoboAction|DoboModel.TResultRemoveRecord|DoboModel.TRecord}
 */
async function removeRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  let [id, opts = {}] = args
  const { getDefaultValues } = this.app.dobo
  const { isSet } = this.app.lib.aneka
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  const { noResult, noResultSanitizer } = options
  id = this.sanitizeId(id)
  await execHook.call(this, 'beforeRemoveRecord', id, options)
  await execModelHook.call(this, 'beforeRemoveRecord', id, options)
  await execDynHook.call(this, 'beforeRemoveRecord', id, options)
  const result = options.record ?? (await this.adapter._removeRecord(this, id, options)) ?? {}
  if (noResult) return
  await handleReq.call(this, result.oldData.id, 'removed', options)
  await clearCache.call(this, id)
  const { warnings } = getDefaultValues(options)
  if (!warnings) delete result.warnings
  if (!noResultSanitizer) result.oldData = await this.sanitizeRecord(result.oldData, options)
  if (isSet(options.refs)) await getRefs.call(this, [result.data], options)
  await execDynHook.call(this, 'afterRemoveRecord', id, result, options)
  await execModelHook.call(this, 'afterRemoveRecord', id, result, options)
  await execHook.call(this, 'afterRemoveRecord', id, result, options)
  return dataOnly ? result.oldData : result
}

export default removeRecord
