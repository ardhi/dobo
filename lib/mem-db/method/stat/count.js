import { Query } from 'mingo'

async function count ({ schema, filter = {}, options = {} }) {
  const criteria = filter.query ?? {}
  const q = new Query(criteria, { idKey: 'id' })
  const cursor = q.find(this.memDb.storage[schema.name])
  const count = cursor.count()
  return { data: count }
}

export default count
