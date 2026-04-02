import { cloneOptions } from './_util.js'

const action = 'findOneRecord'

async function findOneRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const { getDefaultValues } = this.app.dobo
  const [params = {}, opts = {}] = args
  const { cloneDeep } = this.app.lib._
  const { dataOnly = true } = opts
  if (dataOnly) opts.count = false
  const nFilter = cloneDeep(params || {})
  const nOptions = cloneOptions.call(this, opts)
  nOptions.count = false
  nOptions.dataOnly = false
  nFilter.limit = 1
  const { warnings } = getDefaultValues(nOptions)
  const resp = await this.findRecord(nFilter, nOptions)
  const data = resp.data[0]
  const result = { data, cached: resp.cached, warnings: resp.warnings }
  if (!warnings) delete result.warnings
  return dataOnly ? data : result
}

export default findOneRecord
