import postProcess from './lib/post-process.js'

async function clearRecord (path, ...args) {
  const { importPkg } = this.app.bajo
  const { isEmpty, map } = this.app.lib._
  const { parseKvString } = this.app.lib.aneka
  const select = await importPkg('bajoCli:@inquirer/select')
  if (isEmpty(this.models)) return this.print.fail('notFound%s', this.t('field.model'), { exit: this.app.applet })
  let [model, options] = args
  options = isEmpty(options) ? {} : parseKvString(options)
  if (isEmpty(model)) {
    model = await select({
      message: this.print.buildText('selectModel'),
      choices: map(this.models, s => ({ value: s.name }))
    })
  }
  await postProcess.call(this, { noConfirmation: options.noConfirmation, handler: 'clearRecord', params: [model, options], path, processMsg: 'Clearing all records' })
  // if (!result) await createRecord.call(this, path, ...args)
  this.app.exit()
}

export default clearRecord
