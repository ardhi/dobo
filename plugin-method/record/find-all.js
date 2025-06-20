async function findAll (name, filter = {}, options = {}) {
  filter.page = 1
  filter.limit = 100
  options.dataOnly = true
  const match = filter.match
  const all = []
  for (;;) {
    filter.match = match
    const results = await this.recordFind(name, filter, options)
    if (results.length === 0) break
    all.push(...results)
    filter.page++
  }
  return all
}

export default findAll
