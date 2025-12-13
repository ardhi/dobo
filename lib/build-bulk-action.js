async function buildBulkAction (name, action, options = {}) {
  const { fs, importModule } = this.app.bajo
  const { camelCase } = this.app.lib._
  const { schema, driver, connection } = await this.getInfo(name)
  if (!options.force && (schema.disabled ?? []).includes(action)) throw this.error('methodIsDisabled%s%s', camelCase('bulk ' + action), name)
  const file = `${driver.plugin}:/extend/${this.ns}/method/bulk/${action}.js`
  if (!fs.existsSync(file)) throw this.error('methodUnsupported%s%s', camelCase('bulk ' + action), name)
  const handler = await importModule(file)
  return { handler, schema, driver, connection }
}

export default buildBulkAction
