import { getFilterAndOptions, execHook, execModelHook, execDynHook } from './helper.js'
const action = 'histogram'

async function histogram (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const [_filter = {}, params = {}, opts = {}] = args
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { filter, options } = await getFilterAndOptions.call(this, _filter, opts, action)
  const { getDefaultValues } = this.app.dobo
  await execHook.call(this, 'beforeHistogram', filter, params, options)
  await execModelHook.call(this, 'beforeHistogram', filter, params, options)
  await execDynHook.call(this, 'beforeHistogram', filter, params, options)
  const result = (await this.adapter._histogram(this, filter, params, options)) ?? {}
  const { warnings } = getDefaultValues(options)
  if (!warnings) delete result.warnings
  await execDynHook.call(this, 'afterHistogram', filter, params, result, options)
  await execModelHook.call(this, 'afterHistogram', filter, params, result, options)
  await execHook.call(this, 'afterHistogram', filter, params, result, options)
  return dataOnly ? result.data : result
}

export default histogram
