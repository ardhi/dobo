import { getFilterAndOptions, execHook, execModelHook } from './_util.js'

async function build (opts = {}) {
  const { dataOnly = true } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts)
  await execHook.call(this, 'beforeBuildModel', options)
  await execModelHook.call(this, 'beforeBuildModel', options)
  const result = (await this.driver._buildModel(this, options)) ?? {}
  await execModelHook.call(this, 'afterBuildModel', result, options)
  await execHook.call(this, 'afterBuildModel', result, options)
  return dataOnly ? result.data : result
}

export default build
