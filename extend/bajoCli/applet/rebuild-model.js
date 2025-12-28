async function modelRebuild (path, ...args) {
  const { importPkg } = this.app.bajo
  const { outmatch } = this.app.lib
  const { isEmpty, map, trim, without } = this.app.lib._
  const [input, confirm, boxen] = await importPkg('bajoCli:@inquirer/input',
    'bajoCli:@inquirer/confirm', 'bajoCli:boxen')
  const models = map(this.models, 'name')
  let names = args.join(' ')
  if (isEmpty(models)) return this.print.fail('notFound%s', 'model', { exit: this.app.applet })
  if (isEmpty(names)) {
    names = await input({
      message: this.print.buildText('enterModelName'),
      default: '*'
    })
  }
  const isMatch = outmatch(map(names.split(' '), m => trim(m)))
  names = models.filter(isMatch)
  if (names.length === 0) return this.print.fail('No model matched', true, { exit: this.app.applet })
  console.log(boxen(names.join(' '), { title: this.t('model%d', names.length), padding: 0.5, borderStyle: 'round' }))
  const answer = await confirm({
    message: this.print.buildText('modelsWillBeRebuiltContinue'),
    default: false
  })
  if (!answer) return this.print.fail('aborted', { exit: this.app.applet })
  /*
  const conns = []
  for (const s of names) {
    const { connection } = this.getInfo(s)
    if (!conns.includes(connection.name)) conns.push(connection.name)
  }
  */
  await this.start('all')
  const result = { succed: 0, failed: 0, skipped: 0 }
  const skipped = []
  for (const s of names) {
    const model = this.getModel(s)
    const spin = this.print.spinner().start('rebuilding%s', model.name)
    if (model.connection.memory) {
      spin.warn('memoryDbSkipped%s', model.name)
      continue
    }
    const exists = await model.exists({ spinner: spin })
    if (exists) {
      if (this.app.bajo.config.force) {
        try {
          await model.drop({ spinner: spin })
          spin.setText('modelDropped%s', model.name)
        } catch (err) {
          spin.fail('errorDroppingModel%s%s', model.name, err.message)
          result.failed++
          continue
        }
      } else {
        spin.fail('modelExistsNeedForce%s', model.name)
        result.failed++
        continue
      }
    }
    try {
      await model.build({ spinner: spin })
      spin.succeed('modelCreated%s', model.name)
      result.succed++
    } catch (err) {
      if (this.app.bajo.config.log.applet) console.error(err)
      spin.fail('errorCreatingModel%s%s', model.name, err.message)
      result.failed++
    }
  }
  this.print.info('succeedFailSkip%d%d%d', result.succed, result.failed, result.skipped)
  if (result.failed > 0) this.print.fatal('cantContinueAddFixture')
  for (const s of without(names, ...skipped)) {
    const model = this.getModel(s)
    const spin = this.print.spinner().start('addingFixture%s', model.name)
    if (model.connection.memory) {
      spin.warn('memoryDbSkipped%s', model.name)
      continue
    }
    try {
      const fixture = await model.loadFixtures({ spinner: spin })
      spin.succeed('fixtureAdded%s%s%s', model.name, fixture.success, fixture.failed)
      result.succed++
    } catch (err) {
      if (this.app.bajo.config.log.applet) console.error(err)
      spin.fail('errorAddingFixture%s%s', model.name, err.message)
      result.failed++
    }
  }
  this.app.exit()
}

export default modelRebuild
