import { getFilterAndOptions, execHook, execModelHook, execDynHook } from './_util.js'
const action = 'countRecord'

async function countRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const [params = {}, opts = {}] = args
  const { dataOnly = true } = opts
  const { filter, options } = await getFilterAndOptions.call(this, params, opts, action)
  await execHook.call(this, 'beforeCountRecord', options)
  await execModelHook.call(this, 'beforeCountRecord', filter, options)
  await execDynHook.call(this, 'beforeCountRecord', filter, options)
  const result = (await this.driver._countRecord(this, filter, options)) ?? {}
  await execDynHook.call(this, 'afterCountRecord', filter, result, options)
  await execModelHook.call(this, 'afterCountRecord', filter, result, options)
  await execHook.call(this, 'afterCountRecord', filter, result, options)
  return dataOnly ? result.data : result
}

export default countRecord
