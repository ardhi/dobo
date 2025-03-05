function preCheck (name) {
  name = this.app.bajo.pascalCase(name)
  const schema = this.getSchema(name)
  if (!schema.attachment) return false
  return name
}

export default preCheck
