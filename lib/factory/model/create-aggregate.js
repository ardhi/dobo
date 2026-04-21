import { getFilterAndOptions, execHook, execModelHook, execDynHook } from './_util.js'
const action = 'createAggregate'

async function createAggregate (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const [_filter = {}, params = {}, opts = {}] = args
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { filter, options } = await getFilterAndOptions.call(this, _filter, opts, action)
  const { getDefaultValues } = this.app.dobo
  await execHook.call(this, 'beforeCreateAggregate', filter, params, options)
  await execModelHook.call(this, 'beforeCreateAggregate', filter, params, options)
  await execDynHook.call(this, 'beforeCreateAggregate', filter, params, options)
  const result = (await this.driver._createAggregate(this, filter, params, options)) ?? {}
  const { warnings } = getDefaultValues(options)
  if (!warnings) delete result.warnings
  await execDynHook.call(this, 'afterCreateAggregate', filter, params, result, options)
  await execModelHook.call(this, 'afterCreateAggregate', filter, params, result, options)
  await execHook.call(this, 'afterCreateAggregate', filter, params, result, options)
  return dataOnly ? result.data : result
}

export default createAggregate
