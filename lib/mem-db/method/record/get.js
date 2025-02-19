async function get ({ schema, id, options = {} }) {
  const { thrownNotFound = true } = options
  const { find } = this.app.bajo.lib._
  const result = find(this.memDb.storage[schema.name], { id })
  if (!result && thrownNotFound) throw this.error('recordNotFound%s%s', id, schema.name, { statusCode: 404 })
  return { data: result }
}

export default get
