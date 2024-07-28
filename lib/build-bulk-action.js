async function buildBulkAction (name, action, options = {}) {
  const { fs, importModule } = this.app.bajo
  const { camelCase } = this.app.bajo.lib._
  const { schema, driver, connection } = await this.getInfo(name)
  if (!options.force && (schema.disabled ?? []).includes(action)) throw this.error('Method \'%s:%s\' is disabled', camelCase('bulk ' + action), name)
  const file = `${driver.plugin}:/${this.name}/method/bulk/${action}.js`
  if (!fs.existsSync(file)) throw this.error('Method \'%s:%s\' is unsupported', camelCase('bulk ' + action), name)
  const handler = await importModule(file)
  return { handler, schema, driver, connection }
}

export default buildBulkAction