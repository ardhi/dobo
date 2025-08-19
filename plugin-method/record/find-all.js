async function findAll (name, filter = {}, options = {}) {
  const { maxLimit, hardLimit } = this.config.default.filter
  filter.page = 1
  filter.limit = maxLimit
  options.dataOnly = true
  const match = filter.match
  const all = []
  let count = 0
  for (;;) {
    filter.match = match
    const results = await this.recordFind(name, filter, options)
    if (results.length === 0) break
    if (count + results.length > hardLimit) {
      const sliced = results.slice(0, hardLimit - count)
      all.push(...sliced)
      break
    }
    all.push(...results)
    count = count + results.length
    filter.page++
  }
  return all
}

export default findAll
