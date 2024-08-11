async function exists ({ schema, options = {} }) {
  this.memDb.storage[schema.name].splice(0)
}

export default exists
