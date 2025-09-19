import addFixtures from '../../../lib/add-fixtures.js'

async function modelRebuild (path, ...args) {
  const { importPkg } = this.app.bajo
  const { outmatch } = this.app.lib
  const { isEmpty, map, trim, without } = this.app.lib._
  const [input, confirm, boxen] = await importPkg('bajoCli:@inquirer/input',
    'bajoCli:@inquirer/confirm', 'bajoCli:boxen')
  const schemas = map(this.schemas, 'name')
  let names = args.join(' ')
  if (isEmpty(schemas)) return this.print.fail('notFound%s', 'schema', { exit: this.app.applet })
  if (isEmpty(names)) {
    names = await input({
      message: this.print.buildText('enterSchemaName'),
      default: '*'
    })
  }
  const isMatch = outmatch(map(names.split(' '), m => trim(m)))
  names = schemas.filter(isMatch)
  if (names.length === 0) return this.print.fail('No schema matched', true, { exit: this.app.applet })
  console.log(boxen(names.join(' '), { title: this.t('schema%d', names.length), padding: 0.5, borderStyle: 'round' }))
  const answer = await confirm({
    message: this.print.buildText('schemasWillBeRebuiltContinue'),
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
    const { schema, instance } = this.getInfo(s)
    const spin = this.print.spinner().start('rebuilding%s', schema.name)
    if (!instance) {
      spin.warn('clientInstanceNotConnected%s', schema.connection, schema.name)
      skipped.push(schema.name)
      result.skipped++
      continue
    }
    /*
    if (connection.memory) {
      spin.warn('memoryDbSkipped%s', schema.name)
      continue
    }
    */
    const exists = await this.modelExists(schema.name, false, { spinner: spin })
    if (exists) {
      if (this.app.bajo.config.force) {
        try {
          await this.modelDrop(schema.name, { spinner: spin })
          spin.setText('modelDropped%s', schema.name)
        } catch (err) {
          spin.fail('errorDroppingModel%s%s', schema.name, err.message)
          result.failed++
          continue
        }
      } else {
        spin.fail('modelExistsNeedForce%s', schema.name)
        result.failed++
        continue
      }
    }
    try {
      await this.modelCreate(schema.name, { spinner: spin })
      spin.succeed('modelCreated%s', schema.name)
      result.succed++
    } catch (err) {
      if (this.app.bajo.config.log.applet && this.app.bajo.config.log.level === 'trace') console.error(err)
      spin.fail('errorCreatingModel%s%s', schema.name, err.message)
      result.failed++
    }
  }
  this.print.info('succeedFailSkip%d%d%d', result.succed, result.failed, result.skipped)
  if (result.failed > 0) this.print.fatal('cantContinueAddFixture')
  for (const s of without(names, ...skipped)) {
    const { schema, connection } = this.getInfo(s)
    const spin = this.print.spinner().start('addingFixture%s', schema.name)
    if (connection.memory) {
      spin.warn('memoryDbSkipped%s', schema.name)
      continue
    }
    try {
      const fixture = await addFixtures.call(this, schema.name, { spinner: spin })
      spin.succeed('fixtureAdded%s%s%s', schema.name, fixture.success, fixture.failed)
      result.succed++
    } catch (err) {
      if (this.app.bajo.config.log.applet && this.app.bajo.config.log.level === 'trace') console.error(err)
      spin.fail('errorAddingFixture%s%s', schema.name, err.message)
      result.failed++
    }
  }
  this.app.exit()
}

export default modelRebuild
