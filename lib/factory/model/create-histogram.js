import { getFilterAndOptions, execHook, execModelHook } from './_util.js'

async function createHistogram (...args) {
  if (args.length === 0) return this.action('createHistogram', ...args)
  const [params = {}, opts = {}] = args
  const { dataOnly = true } = opts
  const { filter, options } = getFilterAndOptions.call(this, params, opts)
  await execHook.call(this, 'beforeCreateHistogram', filter, options)
  await execModelHook.call(this, 'beforeCreateHistogram', filter, options)
  const result = (await this.driver._createHistogram(this, filter, options)) ?? {}
  await execModelHook.call(this, 'afterCreateHistogram', filter, result, options)
  await execHook.call(this, 'afterCreateHistogram', filter, result, options)
  return dataOnly ? result.data : result
}

export default createHistogram
