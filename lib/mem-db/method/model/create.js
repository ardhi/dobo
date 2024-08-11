async function exists ({ schema, options = {} }) {
  this.memDb.storage[schema.name] = []
}

export default exists
