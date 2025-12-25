import postProcess from './lib/post-process.js'

async function updateRecord (path, ...args) {
  const { importPkg } = this.app.bajo
  const { isEmpty, map } = this.app.lib._
  const { parseKvString } = this.app.lib.aneka
  const [input, select, boxen] = await importPkg('bajoCli:@inquirer/input',
    'bajoCli:@inquirer/select', 'bajoCli:boxen')
  if (isEmpty(this.models)) return this.print.fail('notFound%s', this.t('field.model'), { exit: this.app.applet })
  let [model, id, body, options] = args
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
  if (isEmpty(body)) {
    body = await input({
      message: this.print.buildText('enterPayload'),
      validate: text => {
        if (isEmpty(text)) return this.t('payloadRequired')
        return true
      }
    })
  }
  let payload
  try {
    payload = body[0] === '{' ? JSON.parse(body) : parseKvString(body)
  } catch (err) {
    return this.print.fail('invalidPayloadSyntax', { exit: this.app.applet })
  }
  console.log(boxen(JSON.stringify(payload, null, 2), { title: model, padding: 0.5, borderStyle: 'round' }))
  await postProcess.call(this, { noConfirmation: options.confirmation, handler: 'updateRecord', params: [model, id, payload, options], path, processMsg: 'Updating record' })
  this.app.exit()
}

export default updateRecord
