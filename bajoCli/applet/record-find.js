import postProcess from './lib/post-process.js'

async function findRecord (path, ...args) {
  const { importPkg } = this.app.bajo
  const { isEmpty, map, pick } = this.app.bajo.lib._
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
  if (isEmpty(query)) query = {}
  const filter = pick(this.app.bajo.config, ['page', 'offset', 'pageSize', 'sort', 'limit'])
  filter.pageSize = filter.pageSize ?? filter.limit
  filter.query = query
  await postProcess.call(this, { noConfirmation: true, handler: 'recordFind', params: [schema, filter], path, processMsg: 'Finding record(s)' })
}

export default findRecord
