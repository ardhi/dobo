import { getFilterAndOptions, execHook, execModelHook } from './_util.js'

async function drop (opts = {}) {
  const { dataOnly = true } = opts
  const { options } = getFilterAndOptions.call(this, null, opts)
  await execHook.call(this, 'beforeDropModel', options)
  await execModelHook.call(this, 'beforeDropModel', options)
  const result = (await this.driver._dropModel(this, options)) ?? {}
  await execModelHook.call(this, 'afterDropModel', result, options)
  await execHook.call(this, 'afterModelDrop', result, options)
  return dataOnly ? result.data : result
}

export default drop
