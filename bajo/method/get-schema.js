function getSchema (input, cloned = true) {
  const { find, isPlainObject, cloneDeep } = this.app.bajo.lib._
  let name = isPlainObject(input) ? input.name : input
  name = this.app.bajo.pascalCase(name)
  const schema = find(this.schemas, { name })
  if (!schema) throw this.error('Unknown model/schema \'%s\'', name)
  return cloned ? cloneDeep(schema) : schema
}

export default getSchema
