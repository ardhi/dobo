const conns = []

async function postProcess ({ handler, params, path, processMsg, noConfirmation } = {}) {
  const { _: argv } = this.app.argv
  const { saveAsDownload, importPkg } = this.app.bajo
  const { prettyPrint } = this.app.bajoCli
  const { find, get } = this.app.lib._
  const [stripAnsi, confirm] = await importPkg('bajoCli:strip-ansi', 'bajoCli:@inquirer/confirm')
  if (!noConfirmation && argv.confirmation === false) noConfirmation = true
  params.push({ fields: argv.fields, dataOnly: !argv.full })

  const schema = find(this.schemas, { name: params[0] })
  if (!schema) return this.print.fatal('notFound%s', this.t('field.schema'))
  let cont = true
  if (!noConfirmation) {
    const answer = await confirm({ message: this.t('sureContinue'), default: false })
    if (!answer) {
      this.print.fail('aborted')
      cont = false
    }
  }
  if (!cont) return
  const spin = this.print.spinner().start(`${processMsg}...`)
  const { connection } = this.getInfo(schema)
  if (!conns.includes(connection.name)) {
    await this.start(connection.name)
    conns.push(connection.name)
  }
  try {
    const resp = await this[handler](...params)
    spin.succeed('done')
    const result = argv.pretty ? (await prettyPrint(resp)) : JSON.stringify(resp, null, 2)
    if (argv.save) {
      const id = resp.id ?? get(resp, 'data.id') ?? get(resp, 'oldData.id')
      const base = path === 'recordFind' ? params[0] : (params[0] + '/' + id)
      const file = `/${path}/${base}.${argv.pretty ? 'txt' : 'json'}`
      await saveAsDownload(file, stripAnsi(result))
    } else console.log(result)
  } catch (err) {
    if (this.app.bajo.config.log.applet) {
      spin.stop()
      console.error(err)
    } else spin.fail('error%s', err.message)
  }
  this.app.exit()
}

export default postProcess
