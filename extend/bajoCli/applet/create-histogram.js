import postProcess from './lib/post-process.js'

async function createHistogram (path, ...args) {
  const { importPkg } = this.app.bajo
  const { isEmpty, map } = this.app.lib._
  const { parseKvString } = this.app.lib.aneka
  const [select, input] = await importPkg('bajoCli:@inquirer/select', 'bajoCli:@inquirer/input')
  if (isEmpty(this.models)) return this.print.fail('notFound%s', this.t('field.model'), { exit: this.app.applet })
  let [model, filter, params, options] = args
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
  if (isEmpty(params)) {
    params = await input({
      message: this.print.buildText('enterParams')
    })
  }
  params = isEmpty(params) ? {} : parseKvString(params)
  await postProcess.call(this, { noConfirmation: true, handler: 'createHistogram', params: [model, filter, params, options], path, processMsg: 'Create histogram' })
  this.app.exit()
}

export default createHistogram
