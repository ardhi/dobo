import { getFilterAndOptions, execHook, execModelHook, execDynHook, getRefs } from './helper.js'
const action = 'getRecord'

/**
 * Gets a record from the model's underlying data store based on the provided ID.
 *
 * If no arguments are provided, it automatically turns into a chainable {@link DoboAction} object.
 * @async
 * @memberof DoboModel
 * @method
 * @param  {string|number} id - The ID of the record to be retrieved.
 * @param  {DoboModel.TOptions} [opts] - Options object.
 * @returns {DoboAction|DoboModel.TResultGetRecord|DoboModel.TRecord}
 * @see {@link DoboModel.THookBeforeGetRecord}
 * @see {@link DoboModel.THookAfterGetRecord}
 */
async function getRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  let [id, opts = {}] = args
  const { getDefaultValues } = this.app.dobo
  const { isEmpty } = this.app.lib._
  const { isSet } = this.app.lib.aneka
  const { get, set } = this.app.bajoCache ?? {}
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  const { noResultSanitizer } = options
  id = this.sanitizeId(id)
  await execHook.call(this, 'beforeGetRecord', id, options)
  await execModelHook.call(this, 'beforeGetRecord', id, options)
  await execDynHook.call(this, 'beforeGetRecord', id, options)
  if (get) {
    const resp = await get({ model: this, action, id, options })
    if (resp) {
      resp.cached = true
      return dataOnly ? resp.data : resp
    }
  }
  const result = options.record ?? (await this.adapter._getRecord(this, id, options)) ?? {}
  const { warnings } = getDefaultValues(options)
  if (!warnings) delete result.warnings
  if (isEmpty(result.data) && !options.throwNotFound) return dataOnly ? undefined : { data: undefined }
  if (isSet(options.refs)) await getRefs.call(this, [result.data], options)
  if (!noResultSanitizer) result.data = await this.sanitizeRecord(result.data, options)
  await execDynHook.call(this, 'afterGetRecord', id, result, options)
  await execModelHook.call(this, 'afterGetRecord', id, result, options)
  await execHook.call(this, 'afterGetRecord', id, result, options)
  if (set) await set({ model: this, action, id, options, result })
  return dataOnly ? result.data : result
}

export default getRecord
