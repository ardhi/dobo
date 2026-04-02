import { getFilterAndOptions, execHook, execModelHook, execDynHook } from './_util.js'
const action = 'countRecord'

async function countRecord (...args) {
  const { getDefaultValues } = this.app.dobo
  if (args.length === 0) return this.action(action, ...args)
  const [params = {}, opts = {}] = args
  const { dataOnly = true } = opts
  const { filter, options } = await getFilterAndOptions.call(this, params, opts, action)
  const { hardCap, t } = getDefaultValues(options)
  await execHook.call(this, 'beforeCountRecord', options)
  await execModelHook.call(this, 'beforeCountRecord', filter, options)
  await execDynHook.call(this, 'beforeCountRecord', filter, options)
  const result = (await this.driver._countRecord(this, filter, options)) ?? {}
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
