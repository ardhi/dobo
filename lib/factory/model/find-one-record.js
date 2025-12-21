import { getFilterAndOptions, buildQueryAndMatchFilter } from './_util.js'

async function findOneRecord (params = {}, opts = {}) {
  const { cloneDeep } = this.app.lib._
  const { dataOnly = true } = opts
  const { filter, options } = getFilterAndOptions.call(this, params, opts)
  const nFilter = cloneDeep(filter)
  const nOptions = cloneDeep(options)
  nOptions.count = false
  nOptions.dataOnly = false
  await buildQueryAndMatchFilter.call(this, nFilter, nOptions)
  nFilter.limit = 1
  const result = await this.findRecord(nFilter, nOptions)
  const data = result.data[0]
  return dataOnly ? data : { data }
}

export default findOneRecord
