import { getFilterAndOptions, execHook, execModelHook, buildQueryAndMatchFilter } from './_util.js'

async function countRecord (...args) {
  if (args.length === 0) return this.action('countRecord', ...args)
  const [params = {}, opts = {}] = args
  const { dataOnly = true } = opts
  const { filter, options } = getFilterAndOptions.call(this, params, opts)
  await buildQueryAndMatchFilter.call(this, filter, options)
  await execHook.call(this, 'beforeCountRecord', options)
  await execModelHook.call(this, 'beforeCountRecord', filter, options)
  const result = (await this.driver._countRecord(this, filter, options)) ?? {}
  await execModelHook.call(this, 'afterCountRecord', filter, result, options)
  await execHook.call(this, 'afterCountRecord', filter, result, options)
  return dataOnly ? result.data : result
}

export default countRecord
