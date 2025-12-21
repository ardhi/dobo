import { getFilterAndOptions, execHook } from './_util.js'

async function build (opts = {}) {
  const { options } = getFilterAndOptions.call(this, null, opts)
  await execHook.call(this, 'beforeBuildModel', options)
  const result = await this.driver._buildModel(this, options)
  await execHook.call(this, 'afterBuildModel', result, options)
  return result
}

export default build
