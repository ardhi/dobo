async function resolveMethod (name, method, options = {}) {
  const { importModule } = this.app.bajo
  const { fs } = this.app.lib
  const { camelCase } = this.app.lib._
  const { schema, driver, connection } = this.getInfo(name)
  const [group, action] = method.split('-')
  if (!options.force && (schema.disabled ?? []).includes(action)) throw this.error('methodIsDisabled%s%s', camelCase(method), name)
  let file
  if (connection.name === 'memory') file = `${this.app[driver.ns].dir.pkg}/lib/mem-db/method/${group}/${action}.js`
  else file = `${this.app[driver.ns].dir.pkg}/extend/${this.name}/method/${group}/${action}.js`
  if (!fs.existsSync(file)) throw this.error('methodUnsupported%s%s', camelCase(method), name)
  const handler = await importModule(file)
  return { handler, schema, driver, connection }
}

export default resolveMethod
