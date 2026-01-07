import { getFilterAndOptions, execHook, execModelHook } from './_util.js'
const action = 'clearRecord'

async function clearRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const [opts = {}] = args
  const { dataOnly = true } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  await execHook.call(this, 'beforeClearRecord', options)
  await execModelHook.call(this, 'beforeClearRecord', options)
  const result = (await this.driver._clearRecord(this, options)) ?? {}
  await execModelHook.call(this, 'afterClearRecord', result, options)
  await execHook.call(this, 'afterClearRecord', result, options)
  return dataOnly ? result.data : result
}

export default clearRecord
