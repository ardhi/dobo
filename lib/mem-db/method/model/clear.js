async function clear ({ schema, options = {} }) {
  this.memDb.storage[schema.name].splice(0)
  return true
}

export default clear
