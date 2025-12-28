/**
 * Prepare records pagination:
 * - making sure records limit is obeyed
 * - making sure page is a positive value
 * - if skip is given, recalculate limit to use skip instead of page number
 * - Build sort info
 *
 * @method
 * @async
 * @param {Object} [filter={}] - Filter object
 * @param {Object} options - Options
 * @returns {TRecordPagination}
 */
function preparePagination (filter = {}, options = {}) {
  const { isEmpty, map, each, isPlainObject, isString, trim, keys } = this.app.lib._
  const config = this.app.dobo.config

  const buildPageSkipLimit = (filter) => {
    let limit = parseInt(filter.limit) || config.default.filter.limit
    if (limit === -1) limit = config.default.filter.maxLimit
    if (limit > config.default.filter.maxLimit) limit = config.default.filter.maxLimit
    if (limit < 1) limit = 1
    let page = parseInt(filter.page) || 1
    if (page < 1) page = 1
    let skip = (page - 1) * limit
    if (filter.skip) {
      skip = parseInt(filter.skip) || skip
      page = undefined
    }
    if (skip < 0) skip = 0
    return { page, skip, limit }
  }

  const buildSort = (input, allowSortUnindexed) => {
    let sort
    if (isEmpty(input)) {
      const columns = map(this.properties ?? [], 'name')
      each(config.default.filter.sort, s => {
        const [col] = s.split(':')
        if (columns.includes(col)) {
          input = s
          return false
        }
      })
    }
    if (!isEmpty(input)) {
      if (isPlainObject(input)) sort = input
      else if (isString(input)) {
        const item = {}
        each(input.split('+'), text => {
          let [col, dir] = map(trim(text).split(':'), i => trim(i))
          dir = (dir ?? '').toUpperCase()
          dir = dir === 'DESC' ? -1 : parseInt(dir) || 1
          item[col] = dir / Math.abs(dir)
        })
        sort = item
      }
      const items = keys(sort)
      each(items, i => {
        if (!this.sortables.includes(i) && !allowSortUnindexed) throw this.app.dobo.error('sortOnUnindexedField%s%s', i, this.name)
        // if (model.fullText.fields.includes(i)) throw this.error('Can\'t sort on full-text index: \'%s@%s\'', i, model.name)
      })
    }
    return sort
  }

  const { page, skip, limit } = buildPageSkipLimit(filter)
  let sortInput = filter.sort
  try {
    sortInput = JSON.parse(sortInput)
  } catch (err) {
  }
  const sort = buildSort(sortInput, options.allowSortUnindexed)
  return { limit, page, skip, sort }
}

export default preparePagination
