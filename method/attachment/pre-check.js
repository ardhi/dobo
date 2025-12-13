function preCheck (name) {
  const { pascalCase } = this.app.lib.aneka
  name = pascalCase(name)
  const schema = this.getSchema(name)
  if (!schema.attachment) return false
  return name
}

export default preCheck
