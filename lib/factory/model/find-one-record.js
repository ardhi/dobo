const action = 'findOneRecord'

async function findOneRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const [params = {}, opts = {}] = args
  const { cloneDeep } = this.app.lib._
  const { dataOnly = true } = opts
  if (dataOnly) opts.count = false
  const nFilter = cloneDeep(params)
  const nOptions = cloneDeep(opts)
  nOptions.count = false
  nOptions.dataOnly = false
  nFilter.limit = 1
  const result = await this.findRecord(nFilter, nOptions)
  const data = result.data[0]
  return dataOnly ? data : { data }
}

export default findOneRecord
