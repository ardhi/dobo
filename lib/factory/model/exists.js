import { getFilterAndOptions, execHook, execModelHook } from './_util.js'
const action = 'modelExists'

/**
 * Method to check if the underlaying table/collection exists already
 *
 * @param {Object} [options]
 * @returns {Object}
 */
async function isExists (opts = {}) {
  const { dataOnly = true } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  await execHook.call(this, 'beforeModelExists', options)
  await execModelHook.call(this, 'beforeModelExists', options)
  const result = (await this.driver._modelExists(this, options)) ?? {}
  await execModelHook.call(this, 'afterModelExists', result, options)
  await execHook.call(this, 'afterModelExists', result, options)
  return dataOnly ? result.data : result
}

export default isExists
