import { getFilterAndOptions, execHook, execModelHook, execDynHook } from './_util.js'
const action = 'createHistogram'

async function createHistogram (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const [_filter = {}, params = {}, opts = {}] = args
  const { dataOnly = true } = opts
  const { filter, options } = await getFilterAndOptions.call(this, _filter, opts, action)
  await execHook.call(this, 'beforeCreateHistogram', filter, params, options)
  await execModelHook.call(this, 'beforeCreateHistogram', filter, params, options)
  await execDynHook.call(this, 'beforeCreateHistogram', filter, params, options)
  const result = (await this.driver._createHistogram(this, filter, params, options)) ?? {}
  await execDynHook.call(this, 'afterCreateHistogram', filter, params, result, options)
  await execModelHook.call(this, 'afterCreateHistogram', filter, params, result, options)
  await execHook.call(this, 'afterCreateHistogram', filter, params, result, options)
  return dataOnly ? result.data : result
}

export default createHistogram
