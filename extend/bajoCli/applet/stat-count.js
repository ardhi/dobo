import postProcess from './lib/post-process.js'

async function statCount (path, ...args) {
  const { importPkg } = this.app.bajo
  const { isEmpty, map } = this.lib._
  const [select, input] = await importPkg('bajoCli:@inquirer/select', 'bajoCli:@inquirer/input')
  if (isEmpty(this.schemas)) return this.print.fail('notFound%s', this.print.write('field.schema'), { exit: this.app.bajo.applet })
  let [schema, query] = args
  if (isEmpty(schema)) {
    schema = await select({
      message: this.print.write('selectSchema'),
      choices: map(this.schemas, s => ({ value: s.name }))
    })
  }
  if (isEmpty(query)) {
    query = await input({
      message: this.print.write('enterQueryIfAny')
    })
  }
  const filter = { query }
  await postProcess.call(this, { noConfirmation: true, handler: 'statCount', params: [schema, filter], path, processMsg: 'Counting record(s)' })
}

export default statCount
