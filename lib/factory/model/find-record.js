import { getFilterAndOptions, execHook, execModelHook, execDynHook, getRefs, sanitizeQuery } from './helper.js'
const action = 'findRecord'

/**
 * @typedef TFilter
 * @type {Object}
 * @memberof DoboModel
 * @see Dobo#recordFind
 * @see Dobo#recordFindOne
 * @see Dobo#recordFindAll
 * @property {(string|Object)} [query={}] - Query definition. See {@tutorial query-language} for more
 * @property {number} limit - Maximum number of records to return
 * @property {number} page - Which page to return
 * @property {number} skip - Records to skip
 * @property {DoboModel.TSort} sort - Sort order info
 */

/**
 * Finds records in the model's underlying data store that match the provided filter criteria.
 *
 * If no arguments are provided, it automatically turns into a chainable {@link DoboAction} object.
 * @async
 * @memberof DoboModel
 * @method
 * @param {DoboModel.TFilter} [filter={}] - The filter criteria to apply when finding records.
 * @param {DoboModel.TOptions} [opts={}] - Options object.
 * @returns {DoboAction|DoboModel.TResultFindRecord|Array.<DoboModel.TRecord>}
 * @see {@link DoboModel.THookBeforeFindRecord}
 * @see {@link DoboModel.THookAfterFindRecord}
 */
async function findRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const { getDefaultValues, t } = this.app.dobo
  const [params = {}, opts = {}] = args
  const { isSet } = this.app.lib.aneka
  const { pick, omit, cloneDeep } = this.app.lib._
  const { get, set } = this.app.bajoCache ?? {}
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { filter, options } = await getFilterAndOptions.call(this, params, opts, action)
  const { hardCap, warnings } = getDefaultValues(options)
  if (dataOnly) options.count = false
  const { noResultSanitizer } = options
  await execHook.call(this, 'beforeFindRecord', filter, options)
  await execModelHook.call(this, 'beforeFindRecord', filter, options)
  await execDynHook.call(this, 'beforeFindRecord', filter, options)
  filter.query = sanitizeQuery.call(this, filter.query)
  const cFilter = cloneDeep(filter)
  if (get) {
    const resp = await get({ model: this, action, filter: cFilter, options })
    if (resp) {
      resp.cached = true
      return dataOnly ? resp.data : resp
    }
  }
  let result = options.record ?? (await this.adapter._findRecord(this, filter, options)) ?? {}
  result.page = filter.page
  result.limit = filter.limit
  result.filter = pick(filter, ['query', 'search', 'sort'])
  result.warnings = result.warnings ?? []
  if (!options.count) result = omit(result, ['count', 'pages'])
  else if (options.count && result.count > hardCap) {
    result.warnings.push(t('hardCapWarning%s%s', result.count, hardCap))
    result.count = hardCap
    result.hardCapped = true
  }
  result.pages = options.count ? Math.ceil(result.count / filter.limit) : undefined
  if (!warnings) delete result.warnings
  if (isSet(options.refs)) await getRefs.call(this, result.data, options)
  if (!noResultSanitizer) {
    for (const idx in result.data) {
      result.data[idx] = await this.sanitizeRecord(result.data[idx], options)
    }
  }
  await execDynHook.call(this, 'afterFindRecord', filter, result, options)
  await execModelHook.call(this, 'afterFindRecord', filter, result, options)
  await execHook.call(this, 'afterFindRecord', filter, result, options)
  if (set) await set({ model: this, action, filter: cFilter, options, result })
  return dataOnly ? result.data : result
}

export default findRecord
