import { getFilterAndOptions, execHook, execModelHook, execDynHook } from './helper.js'
const action = 'countRecord'

/**
 * Counts the number of records in the model's underlying data store that match the provided filter criteria.
 *
 * If no arguments are provided, it automatically turns into a chainable {@link DoboAction} object.
 * @async
 * @memberof DoboModel
 * @method
 * @param {DoboModel.TFilter} [filter={}] - The filter criteria to apply when counting records.
 * @param {DoboModel.TOptions} [opts={}] - Options object.
 * @returns {DoboAction|DoboModel.TResultRecord|DoboModel.TRecord}
 */
async function countRecord (...args) {
  const { getDefaultValues } = this.app.dobo
  if (args.length === 0) return this.action(action, ...args)
  const [params = {}, opts = {}] = args
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { filter, options } = await getFilterAndOptions.call(this, params, opts, action)
  const { hardCap, t } = getDefaultValues(options)
  await execHook.call(this, 'beforeCountRecord', filter, options)
  await execModelHook.call(this, 'beforeCountRecord', filter, options)
  await execDynHook.call(this, 'beforeCountRecord', filter, options)
  const result = (await this.adapter._countRecord(this, filter, options)) ?? {}
  if (result.data > hardCap) {
    result.warnings = result.warnings ?? []
    result.warnings.push(t('hardCapWarning%s%s', result.data, hardCap))
    result.orgCount = result.data
    result.hardCapped = true
    result.data = hardCap
  }
  const { warnings } = getDefaultValues(options)
  if (!warnings) delete result.warnings
  await execDynHook.call(this, 'afterCountRecord', filter, result, options)
  await execModelHook.call(this, 'afterCountRecord', filter, result, options)
  await execHook.call(this, 'afterCountRecord', filter, result, options)
  return dataOnly ? result.data : result
}

export default countRecord
