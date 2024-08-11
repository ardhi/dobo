import getRecord from './get.js'

async function remove ({ schema, id, options = {} }) {
  const { noResult } = options
  const { findIndex, pullAt } = this.app.bajo.lib._
  const rec = noResult ? undefined : await getRecord.call(this, { schema, id })
  const idx = findIndex(this.memDb.storage[schema.name], { id })
  pullAt(this.memDb.storage[schema.name], [idx])
  if (noResult) return
  return { oldData: rec.data }
}

export default remove
