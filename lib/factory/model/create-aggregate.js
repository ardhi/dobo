import { getFilterAndOptions, execHook } from './_util.js'

async function createAggregate (...args) {
  if (args.length === 0) return this.action('createAggregate', ...args)
  const [params = {}, opts = {}] = args
  const { filter, options } = getFilterAndOptions.call(this, params, opts)
  await execHook.call(this, 'beforeCreateAggregate', filter, options)
  const result = (await this.driver._createAggregate(this, filter, options)) ?? {}
  await execHook.call(this, 'afterCreateAggregate', filter, result, options)
  return result
}

export default createAggregate
