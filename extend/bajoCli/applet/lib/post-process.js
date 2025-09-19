const conns = []

async function postProcess ({ handler, params, path, processMsg, noConfirmation } = {}) {
  const { importPkg, generateId } = this.app.bajo
  const { writeOutput } = this.app.bajoCli
  const { find, get, isEmpty } = this.app.lib._
  const [confirm] = await importPkg('bajoCli:strip-ansi', 'bajoCli:@inquirer/confirm')
  const { confirmation, fields, full } = this.app.bajo.config
  if (!noConfirmation && confirmation === false) noConfirmation = true
  params.push({ fields, dataOnly: !full })

  const schema = find(this.schemas, { name: params[0] })
  if (!schema) return this.print.fatal('notFound%s', this.t('field.schema'))
  let cont = true
  if (!noConfirmation) {
    const answer = await confirm({ message: this.print.buildText('sureContinue'), default: false })
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
    if (isEmpty(resp)) {
      spin.warn('noResultFound')
      return false
    }
    spin.succeed('done')
    let actionPath = path
    if (this.app.bajo.config.save) {
      const id = resp.id ?? get(resp, 'data.id') ?? get(resp, 'oldData.id') ?? generateId()
      const base = path === 'recordFind' ? params[0] : (params[0] + '/' + id)
      actionPath += `/${base}`
    }
    await writeOutput(resp, actionPath, true)
    return true
  } catch (err) {
    if (this.app.bajo.config.log.applet) {
      spin.stop()
      console.error(err)
    } else spin.fail('error%s', err.message)
    return false
  }
}

export default postProcess
