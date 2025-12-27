import { getFilterAndOptions, execHook, execModelHook } from './_util.js'

async function createAggregate (...args) {
  if (args.length === 0) return this.action('createAggregate', ...args)
  const [_filter = {}, params = {}, opts = {}] = args
  const { dataOnly = true } = opts
  const { filter, options } = getFilterAndOptions.call(this, _filter, opts)
  await execHook.call(this, 'beforeCreateAggregate', filter, params, options)
  await execModelHook.call(this, 'beforeCreateAggregate', filter, params, options)
  const result = (await this.driver._createAggregate(this, filter, params, options)) ?? {}
  await execModelHook.call(this, 'afterCreateAggregate', filter, params, result, options)
  await execHook.call(this, 'afterCreateAggregate', filter, params, result, options)
  return dataOnly ? result.data : result
}

export default createAggregate
