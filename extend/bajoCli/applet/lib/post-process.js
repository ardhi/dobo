async function postProcess ({ handler, params, path, processMsg, noConfirmation } = {}) {
  const { importPkg } = this.app.bajo
  const { generateId } = this.app.lib.aneka
  const { writeOutput } = this.app.bajoCli
  const { get, isEmpty } = this.app.lib._
  const confirm = await importPkg('bajoCli:@inquirer/confirm')

  const name = params.shift()
  const model = this.getModel(name)
  if (!model) return this.print.fatal('notFound%s', this.t('field.model'))
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
  await this.start([model.connection.name])
  try {
    const resp = await model[handler](...params)
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
    } else spin.fail('error%s', err.detailsMessage ?? err.message)
    return false
  }
}

export default postProcess
