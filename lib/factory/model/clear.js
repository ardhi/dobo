import { getFilterAndOptions, execHook } from './_util.js'

async function clear (opts = {}) {
  const { options } = getFilterAndOptions.call(this, null, opts)
  await execHook.call(this, 'beforeClearModel', options)
  const result = await this.driver._clearModel(this, options)
  await execHook.call(this, 'afterClearModel', result, options)
  return result
}

export default clear
