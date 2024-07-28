async function schema ({ path, args }) {
  const { importPkg } = this.app.bajo
  const { isEmpty, map, find } = this.app.bajo.lib._
  const { getOutputFormat, writeOutput } = this.app.bajoCli
  const select = await importPkg('bajoCli:@inquirer/select')
  const format = getOutputFormat()
  if (isEmpty(this.schemas)) return this.print.fail('No schema found!', { exit: this.app.bajo.applet })
  let name = args[0]
  if (isEmpty(name)) {
    const choices = map(this.schemas, s => ({ value: s.name }))
    name = await select({
      message: this.print.write('Please choose a schema:'),
      choices
    })
  }
  const result = find(this.schemas, { name })
  if (!result) return this.print.fail('Can\'t find %s named \'%s\'', this.print.write('schema'), name, { exit: this.app.bajo.applet })
  this.print.info('Done!')
  await writeOutput(result, path, format)
}

export default schema
