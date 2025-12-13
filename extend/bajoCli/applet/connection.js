async function connection (path, ...args) {
  const { importPkg } = this.app.bajo
  const { isEmpty, map, find } = this.app.lib._
  const select = await importPkg('bajoCli:@inquirer/select')
  const { getOutputFormat, writeOutput } = this.app.bajoCli
  const format = getOutputFormat()
  if (isEmpty(this.connections)) return this.print.fail('notFound%s', 'connection', { exit: this.app.applet })
  let name = args[0]
  if (isEmpty(name)) {
    const choices = map(this.connections, s => ({ value: s.name }))
    name = await select({
      message: this.print.buildText('chooseConn'),
      choices
    })
  }
  const result = find(this.connections, { name })
  if (!result) return this.print.fail('cantFind%s%s', this.t('connection'), name, { exit: this.app.applet })
  this.print.info('done')
  await writeOutput(result, `${this.ns}-${path}-${name}`, format, true)
}

export default connection
