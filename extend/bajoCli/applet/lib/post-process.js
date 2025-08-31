const conns = []

async function postProcess ({ handler, params, path, processMsg, noConfirmation } = {}) {
  const { saveAsDownload, importPkg } = this.app.bajo
  const { prettyPrint } = this.app.bajoCli
  const { find, get } = this.app.lib._
  const [stripAnsi, confirm] = await importPkg('bajoCli:strip-ansi', 'bajoCli:@inquirer/confirm')
  if (!noConfirmation && this.config.confirmation === false) noConfirmation = true
  params.push({ fields: this.config.fields, dataOnly: !this.config.full })

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
    const result = this.config.pretty ? (await prettyPrint(resp)) : JSON.stringify(resp, null, 2)
    if (this.config.save) {
      const id = resp.id ?? get(resp, 'data.id') ?? get(resp, 'oldData.id')
      const base = path === 'recordFind' ? params[0] : (params[0] + '/' + id)
      const file = `/${path}/${base}.${this.config.pretty ? 'txt' : 'json'}`
      await saveAsDownload(file, stripAnsi(result))
    } else console.log(result)
  } catch (err) {
    if (this.config.log.applet) {
      spin.stop()
      console.error(err)
    } else spin.fail('error%s', err.message)
  }
  process.exit()
}

export default postProcess
