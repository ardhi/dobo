import { getFilterAndOptions, execHook } from './_util.js'

/**
 * Method to check if the underlaying table/collection exists already
 *
 * @param {Object} [options]
 * @returns {Object}
 */
async function isExists (opts = {}) {
  const { options } = getFilterAndOptions.call(this, null, opts)
  await execHook.call(this, 'beforeIsExists', options)
  const result = (await this.driver._modelExists(this, options)) ?? {}
  await execHook.call(this, 'afterIsExists', result, options)
  return result
}

export default isExists
