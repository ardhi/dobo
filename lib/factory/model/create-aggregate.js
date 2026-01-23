import { getFilterAndOptions, execHook, execModelHook, execDynHook } from './_util.js'
const action = 'createAggregate'

async function createAggregate (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const [_filter = {}, params = {}, opts = {}] = args
  const { dataOnly = true } = opts
  const { filter, options } = await getFilterAndOptions.call(this, _filter, opts, action)
  await execHook.call(this, 'beforeCreateAggregate', filter, params, options)
  await execModelHook.call(this, 'beforeCreateAggregate', filter, params, options)
  await execDynHook.call(this, 'beforeCreateAggregate', filter, params, options)
  const result = (await this.driver._createAggregate(this, filter, params, options)) ?? {}
  await execDynHook.call(this, 'afterCreateAggregate', filter, params, result, options)
  await execModelHook.call(this, 'afterCreateAggregate', filter, params, result, options)
  await execHook.call(this, 'afterCreateAggregate', filter, params, result, options)
  return dataOnly ? result.data : result
}

export default createAggregate
