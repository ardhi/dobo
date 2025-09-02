import postProcess from './lib/post-process.js'

async function createRecord (path, ...args) {
  const { importPkg } = this.app.bajo
  const { isEmpty, map, isPlainObject } = this.app.lib._
  const [input, select, boxen] = await importPkg('bajoCli:@inquirer/input',
    'bajoCli:@inquirer/select', 'bajoCli:boxen')
  if (isEmpty(this.schemas)) return this.print.fail('notFound%s', this.t('field.schema'), { exit: this.app.applet })
  let [schema, body] = args
  if (isEmpty(schema)) {
    schema = await select({
      message: this.t('selectSchema'),
      choices: map(this.schemas, s => ({ value: s.name }))
    })
  }
  if (isEmpty(body)) {
    body = await input({
      message: this.t('enterJsonPayload'),
      validate: text => {
        if (isEmpty(text)) return this.t('payloadRequired')
        try {
          const parsed = JSON.parse(text)
          if (!isPlainObject(parsed)) throw new Error()
        } catch (err) {
          return this.t('payloadMustBeJson')
        }
        return true
      }
    })
  }
  let payload
  try {
    payload = JSON.parse(body)
  } catch (err) {
    return this.print.fail('invalidPayloadSyntax', { exit: this.app.applet })
  }
  console.log(boxen(JSON.stringify(payload, null, 2), { title: schema, padding: 0.5, borderStyle: 'round' }))
  await postProcess.call(this, { handler: 'recordCreate', params: [schema, payload], path, processMsg: 'Creating record' })
}

export default createRecord
