import { getFilterAndOptions, execHook, execModelHook, execDynHook, getSingleRef, handleReq } from './_util.js'
const action = 'removeRecord'

/**
 * @typedef {Object} TRecordRemoveOptions
 * @see Dobo#recordRemove
 * @property {boolean} [dataOnly=true] - If ```true``` (default) returns deleted record. Otherwise {@link TRecordRemoveResult}
 * @property {boolean} [noHook=false] - If ```true```, no model's hook will be executed
 * @property {boolean} [noModelHook=false] - If ```true```, no model's feature hook will be executed
 * @property {boolean} [noResult=false] - If ```true```, returns nothing
 * @property {boolean} [fields=[]] - If not empty, return only these fields EXCLUDING hidden fields
 * @property {boolean} [hidden=[]] - Additional fields to hide, in addition the one set in model's model
 * @property {boolean} [forceNoHidden=false] - If ```true```, hidden fields will be ignored and ALL fields will be returned
 */

/**
 * Remove existing record by it's ID. All attachments bound to this record will also be removed forever.
 *
 * Example:
 * ```javascript
 * const { recordRemove } = this.app.dobo
 * const result = await recordRemove('CdbCountry', 'ID')
 * ```
 *
 * @method
 * @memberof Model
 * @async
 * @instance
 * @name removeRecord
 * @param {(string|number)} id - Record's ID
 * @param {TRecordRemoveOptions} [options={}]
 * @returns {(TRecordRemoveResult|Object)} Return the removed record if ```options.dataOnly``` is set. {@link TRecordRemoveResult} otherwise
 */
async function removeRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  let [id, opts = {}] = args
  const { isSet } = this.app.lib.aneka
  const { runHook } = this.app.bajo
  const { dataOnly = true } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  const { noResult, noResultSanitizer } = options
  id = this.sanitizeId(id)
  await execHook.call(this, 'beforeRemoveRecord', id, options)
  await execModelHook.call(this, 'beforeRemoveRecord', id, options)
  await execDynHook.call(this, 'beforeRemoveRecord', id, options)
  const result = options.record ?? (await this.driver._removeRecord(this, id, options)) ?? {}
  if (noResult) {
    await runHook('cache:clear', this, 'remove', id)
    return
  }
  if (!noResultSanitizer) result.oldData = await this.sanitizeRecord(result.oldData, options)
  if (isSet(options.refs)) await getSingleRef.call(this, result.data, options)
  await handleReq.call(this, result.oldData.id, 'removed', options)
  await execDynHook.call(this, 'afterRemoveRecord', id, result, options)
  await execModelHook.call(this, 'afterRemoveRecord', id, result, options)
  await execHook.call(this, 'afterRemoveRecord', id, result, options)
  await runHook('cache:clear', this, 'remove', id, result)
  return dataOnly ? result.oldData : result
}

export default removeRecord
