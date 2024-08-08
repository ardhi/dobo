import postProcess from './lib/post-process.js'

async function updateRecord (path, ...args) {
  const { importPkg } = this.app.bajo
  const { isEmpty, map, isPlainObject } = this.app.bajo.lib._
  const [input, select, boxen] = await importPkg('bajoCli:@inquirer/input',
    'bajoCli:@inquirer/select', 'bajoCli:boxen')
  if (isEmpty(this.schemas)) return this.print.fail('No schema found!', { exit: this.app.bajo.applet })
  let [schema, id, body] = args
  if (isEmpty(schema)) {
    schema = await select({
      message: this.print.write('Please select a schema:'),
      choices: map(this.schemas, s => ({ value: s.name }))
    })
  }
  if (isEmpty(id)) {
    id = await input({
      message: this.print.write('Enter record ID:'),
      validate: text => isEmpty(text) ? this.print.write('ID is required') : true
    })
  }
  if (isEmpty(body)) {
    body = await input({
      message: this.print.write('Enter JSON payload:'),
      validate: text => {
        if (isEmpty(text)) return this.print.write('Payload is required')
        try {
          const parsed = JSON.parse(text)
          if (!isPlainObject(parsed)) throw new Error()
        } catch (err) {
          return this.print.write('Payload must be a valid JSON object')
        }
        return true
      }
    })
  }
  let payload
  try {
    payload = JSON.parse(body)
  } catch (err) {
    return this.print.fail('Invalid payload syntax', { exit: this.app.bajo.applet })
  }
  console.log(boxen(JSON.stringify(payload, null, 2), { title: schema, padding: 0.5, borderStyle: 'round' }))
  await postProcess.call(this, { handler: 'recordUpdate', params: [schema, id, payload], path, processMsg: 'Updating record' })
}

export default updateRecord
