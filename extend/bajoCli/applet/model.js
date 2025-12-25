async function model (path, ...args) {
  const { importPkg } = this.app.bajo
  const { isEmpty, map, find } = this.app.lib._
  const { getOutputFormat, writeOutput } = this.app.bajoCli
  const select = await importPkg('bajoCli:@inquirer/select')
  const format = getOutputFormat()
  if (isEmpty(this.models)) return this.print.fail('notFound%s', this.t('field.model'), { exit: this.app.applet })
  let name = args[0]
  if (isEmpty(name)) {
    const choices = map(this.models, s => ({ value: s.name }))
    name = await select({
      message: this.print.buildText('selectModel'),
      choices
    })
  }
  const result = find(this.models, { name })
  if (!result) return this.print.fail('cantFind%s%s', this.t('model'), name, { exit: this.app.applet })
  this.print.info('done')
  await writeOutput(result, path, format)
}

export default model
