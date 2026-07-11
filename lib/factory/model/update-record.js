import { getFilterAndOptions, execHook, execValidation, execModelHook, execDynHook, getRefs, handleReq, clearCache } from './helper.js'
import { onlyTypes } from './create-record.js'
const action = 'updateRecord'

/**
 * Updates an existing record in the model's underlying data store based on the provided ID and data.
 *
 * If no arguments are provided, it automatically turns into a chainable {@link DoboAction} object.
 * @async
 * @memberof DoboModel
 * @method
 * @param  {string|number} id - The ID of the record to be updated.
 * @param  {object} body - The data to update the record with.
 * @param  {DoboModel.TOptions} [opts] - Options object.
 * @see {@link DoboModel.THookBeforeUpdateRecord}
 * @see {@link DoboModel.THookAfterUpdateRecord}
 * @returns {DoboAction|DoboModel.TResultUpdateRecord|DoboModel.TRecord}
 */
async function updateRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  let [id, body = {}, opts = {}] = args
  const { getDefaultValues } = this.app.dobo
  const { isSet } = this.app.lib.aneka
  const { cloneDeep, get, omit } = this.app.lib._
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  options.partial = options.partial ?? true
  const { truncateString, noResult, noBodySanitizer, noResultSanitizer, noValidation, partial } = options
  const extFields = get(options, 'validation.extFields', [])
  id = this.sanitizeId(id)

  let input = noBodySanitizer ? cloneDeep(body) : await this.sanitizeBody({ body, extFields, strict: true, truncateString, partial, onlyTypes, action })
  const immutables = this.properties.filter(prop => prop.immutable)
  if (immutables.length > 0) input = omit(input, immutables)
  delete input.id
  await execHook.call(this, 'beforeUpdateRecord', id, input, options)
  await execModelHook.call(this, 'beforeUpdateRecord', id, input, options)
  await execDynHook.call(this, 'beforeUpdateRecord', id, input, options)
  if (!noValidation) await execValidation.call(this, input, options)
  const result = await this.adapter._updateRecord(this, id, input, options)
  if (noResult) return
  await handleReq.call(this, result.data.id, 'updated', options)
  await clearCache.call(this, id)
  const { warnings } = getDefaultValues(options)
  if (!warnings) delete result.warnings
  if (isSet(options.refs)) await getRefs.call(this, [result.data], options)
  if (!noResultSanitizer) {
    result.data = await this.sanitizeRecord(result.data, options)
    result.oldData = await this.sanitizeRecord(result.oldData, options)
  }
  await execDynHook.call(this, 'afterUpdateRecord', id, input, result, options)
  await execModelHook.call(this, 'afterUpdateRecord', id, input, result, options)
  await execHook.call(this, 'afterUpdateRecord', id, input, result, options)
  return dataOnly ? result.data : result
}

export default updateRecord
