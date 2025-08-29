/**
 * Find all records by model's name and given filter.
 *
 * The total number of records returned is limited by ```hardLimit``` value set in {@tutorial config} file.
 *
 * @see Dobo#recordFind
 * @method
 * @memberof Dobo
 * @async
 * @instance
 * @name recordFindAll
 * @param {string} name - Model's name
 * @param {Object} [filter={}] - Filter object
 * @param {TRecordFindOptions} [options={}]
 * @returns {(TRecordFindResult|Array.<Object>)} Return ```array``` of records if ```options.dataOnly``` is set. {@link TRecordFindResult} otherwise
 */
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
