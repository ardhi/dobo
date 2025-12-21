import { getFilterAndOptions, execHook } from './_util.js'

async function drop (opts = {}) {
  const { options } = getFilterAndOptions.call(this, null, opts)
  await execHook.call(this, 'beforeDropModel', options)
  const result = await this.driver._dropModel(this, options)
  await execHook.call(this, 'afterModelDrop', result, options)
  return result
}

export default drop
