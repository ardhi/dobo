import postProcess from './lib/post-process.js'

async function removeRecord (path, ...args) {
  const { importPkg } = this.app.bajo
  const { isEmpty, map } = this.app.lib._
  const { parseKvString } = this.app.lib.aneka
  const [input, select] = await importPkg('bajoCli:@inquirer/input', 'bajoCli:@inquirer/select')
  if (isEmpty(this.models)) return this.print.fail('notFound%s', this.t('field.model'), { exit: this.app.applet })
  let [model, id, options] = args
  options = isEmpty(options) ? {} : parseKvString(options)
  if (isEmpty(model)) {
    model = await select({
      message: this.print.buildText('selectModel'),
      choices: map(this.models, s => ({ value: s.name }))
    })
  }
  if (isEmpty(id + '')) {
    id = await input({
      message: this.print.buildText('enterRecordId'),
      validate: text => isEmpty(text) ? this.t('idIsRequired') : true
    })
  }
  await postProcess.call(this, { noConfirmation: options.confirmation, handler: 'removeRecord', params: [model, id, options], path, processMsg: 'Removing record' })
  this.app.exit()
}

export default removeRecord
