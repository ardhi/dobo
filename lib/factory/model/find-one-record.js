import { cloneOptions } from './helper.js'

const action = 'findOneRecord'

/**
 * Finds a single record from the model's underlying data store based on the provided filter.
 *
 * If no arguments are provided, it automatically turns into a chainable {@link DoboAction} object.
 * @async
 * @memberof DoboModel
 * @method
 * @param  {DoboModel.TFilter} filter - The filter parameters for finding the record.
 * @param  {DoboModel.TOptions} [opts] - Options object.
 * @returns {DoboAction|DoboModel.TResultFindRecord|Array<DoboModel.TRecord>}
 * @see {@link module:Hook.beforeFindRecord}
 */
async function findOneRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const { getDefaultValues } = this.app.dobo
  const [params = {}, opts = {}] = args
  const { cloneDeep } = this.app.lib._
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  if (dataOnly) opts.count = false
  const nFilter = cloneDeep(params || {})
  const nOptions = cloneOptions.call(this, opts)
  nOptions.count = false
  nOptions.dataOnly = false
  nFilter.limit = 1
  const { warnings } = getDefaultValues(nOptions)
  const resp = await this.findRecord(nFilter, nOptions)
  const data = resp.data[0]
  const result = { data, warnings: resp.warnings }
  if (!warnings) delete result.warnings
  return dataOnly ? data : result
}

export default findOneRecord
