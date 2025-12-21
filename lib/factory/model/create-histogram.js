import { getFilterAndOptions, execHook } from './_util.js'

async function createHistogram (params = {}, opts = {}) {
  const { filter, options } = getFilterAndOptions.call(this, params, opts)
  await execHook.call(this, 'beforeCreateHistogram', filter, options)
  const result = await this.driver._createHistogram(this, filter, options)
  await execHook.call(this, 'afterCreateHistogram', filter, result, options)
  return result
}

export default createHistogram
