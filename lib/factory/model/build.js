import { getFilterAndOptions, execHook, execModelHook } from './helper.js'
const action = 'build'

/**
 * Build a model's definition based on its properties and rules.
 *
 * @async
 * @memberof DoboModel
 * @method
 * @param {DoboModel.TOptions} opts - The options for building the model
 * @returns {DoboModel.TResultRecord|DoboModel.TRecord}
 */
async function build (opts = {}) {
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  await execHook.call(this, 'beforeBuildModel', options)
  await execModelHook.call(this, 'beforeBuildModel', options)
  const result = (await this.adapter._buildModel(this, options)) ?? {}
  await execModelHook.call(this, 'afterBuildModel', result, options)
  await execHook.call(this, 'afterBuildModel', result, options)
  return dataOnly ? result.data : result
}

export default build
