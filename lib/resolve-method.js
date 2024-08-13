async function resolveMethod (name, method, options = {}) {
  const { importModule } = this.app.bajo
  const { fs } = this.app.bajo.lib
  const { camelCase } = this.app.bajo.lib._
  const { schema, driver, connection } = this.getInfo(name)
  if (!options.force && (schema.disabled ?? []).includes(method)) throw this.error('Method \'%s@%s\' is disabled', camelCase(method), name)
  const [group, action] = method.split('-')
  let file
  if (connection.name === 'memory') file = `${this.app[driver.ns].dir.pkg}/lib/mem-db/method/${group}/${action}.js`
  else file = `${this.app[driver.ns].dir.pkg}/${this.name}/method/${group}/${action}.js`
  if (!fs.existsSync(file)) throw this.error('Method \'%s@%s\' is unsupported', camelCase(method), name)
  const handler = await importModule(file)
  return { handler, schema, driver, connection }
}

export default resolveMethod
