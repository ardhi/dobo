import { getFilterAndOptions, execHook, execModelHook } from './_util.js'

async function clearRecord (...args) {
  if (args.length === 0) return this.action('clearRecord', ...args)
  const [opts = {}] = args
  const { dataOnly = true } = opts
  const { options } = getFilterAndOptions.call(this, null, opts)
  await execHook.call(this, 'beforeClearRecord', options)
  await execModelHook.call(this, 'beforeClearRecord', options)
  const result = (await this.driver._clearRecord(this, options)) ?? {}
  await execModelHook.call(this, 'afterClearRecord', result, options)
  await execHook.call(this, 'afterClearRecord', result, options)
  return dataOnly ? result.data : result
}

export default clearRecord
