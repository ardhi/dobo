import { getFilterAndOptions, execHook, execModelHook } from './_util.js'

async function createAggregate (...args) {
  if (args.length === 0) return this.action('createAggregate', ...args)
  const [params = {}, opts = {}] = args
  const { dataOnly = true } = opts
  const { filter, options } = getFilterAndOptions.call(this, params, opts)
  await execHook.call(this, 'beforeCreateAggregate', filter, options)
  await execModelHook.call(this, 'beforeCreateAggregate', filter, options)
  const result = (await this.driver._createAggregate(this, filter, options)) ?? {}
  await execModelHook.call(this, 'afterCreateAggregate', filter, result, options)
  await execHook.call(this, 'afterCreateAggregate', filter, result, options)
  return dataOnly ? result.data : result
}

export default createAggregate
