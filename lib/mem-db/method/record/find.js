import { Query } from 'mingo'

async function find ({ schema, filter = {}, options = {} }) {
  const { prepPagination } = this.app.dobo
  const { omit } = this.app.lib._
  const { limit, skip, sort, page } = await prepPagination(filter, schema)
  const criteria = filter.query ?? {}
  const q = new Query(criteria, { idKey: 'id' })
  let cursor = q.find(this.memDb.storage[schema.name])
  let count = 0
  if (options.count && !options.dataOnly) count = cursor.count()
  cursor = q.find(this.memDb.storage[schema.name])
  if (sort) cursor.sort(sort)
  if (!options.noLimit) cursor.skip(skip).limit(limit)
  let result = { data: cursor.all(), page, limit, count, pages: Math.ceil(count / limit) }
  if (!options.count) result = omit(result, ['count', 'pages'])
  return result
}

export default find
