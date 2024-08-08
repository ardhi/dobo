import postProcess from './lib/post-process.js'

async function statCount (path, ...args) {
  const { importPkg } = this.app.bajo
  const { isEmpty, map } = this.app.bajo.lib._
  const [select, input] = await importPkg('bajoCli:@inquirer/select', 'bajoCli:@inquirer/input')
  if (isEmpty(this.schemas)) return this.print.fail('No schema found!', { exit: this.app.bajo.applet })
  let [schema, query] = args
  if (isEmpty(schema)) {
    schema = await select({
      message: this.print.write('Please select a schema:'),
      choices: map(this.schemas, s => ({ value: s.name }))
    })
  }
  if (isEmpty(query)) {
    query = await input({
      message: this.print.write('Please enter a query (if any):')
    })
  }
  const filter = { query }
  await postProcess.call(this, { noConfirmation: true, handler: 'statCount', params: [schema, filter], path, processMsg: 'Counting record(s)' })
}

export default statCount
