import postProcess from './lib/post-process.js'

async function countRecord (path, ...args) {
  const { importPkg } = this.app.bajo
  const { isEmpty, map } = this.app.lib._
  const { parseKvString } = this.app.lib.aneka
  const [select, input] = await importPkg('bajoCli:@inquirer/select', 'bajoCli:@inquirer/input')
  if (isEmpty(this.models)) return this.print.fail('notFound%s', this.t('field.model'), { exit: this.app.applet })
  let [model, filter, options] = args
  options = isEmpty(options) ? {} : parseKvString(options)
  if (isEmpty(model)) {
    model = await select({
      message: this.print.buildText('selectModel'),
      choices: map(this.models, s => ({ value: s.name }))
    })
  }
  if (isEmpty(filter)) {
    filter = await input({
      message: this.print.buildText('enterFilterIfAny')
    })
  }
  filter = isEmpty(filter) ? {} : parseKvString(filter)
  await postProcess.call(this, { noConfirmation: true, handler: 'countRecord', params: [model, filter, options], path, processMsg: 'Count records' })
  this.app.exit()
}

export default countRecord
