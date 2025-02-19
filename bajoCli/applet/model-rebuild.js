import addFixtures from '../../lib/add-fixtures.js'

async function modelRebuild (...args) {
  const { importPkg } = this.app.bajo
  const { outmatch } = this.app.bajo.lib
  const { isEmpty, map, trim } = this.app.bajo.lib._
  const [input, confirm, boxen] = await importPkg('bajoCli:@inquirer/input',
    'bajoCli:@inquirer/confirm', 'bajoCli:boxen')
  const schemas = map(this.schemas, 'name')
  let names = args.join(' ')
  if (isEmpty(schemas)) return this.print.fail('notFound%s', 'schema', { exit: this.app.bajo.applet })
  if (isEmpty(names)) {
    names = await input({
      message: this.print.write('enterSchemaName'),
      default: '*'
    })
  }
  const isMatch = outmatch(map(names.split(' '), m => trim(m)))
  names = schemas.filter(isMatch)
  if (names.length === 0) return this.print.fail('No schema matched', true, { exit: this.app.bajo.applet })
  names = names.sort()
  console.log(boxen(names.join(' '), { title: this.print.write('schema%d', names.length), padding: 0.5, borderStyle: 'round' }))
  const answer = await confirm({
    message: this.print.write('schemasWillBeRebuiltContinue'),
    default: false
  })
  if (!answer) return this.print.fail('aborted', { exit: this.app.bajo.applet })
  /*
  const conns = []
  for (const s of names) {
    const { connection } = this.getInfo(s)
    if (!conns.includes(connection.name)) conns.push(connection.name)
  }
  */
  await this.start('all')
  const result = { succed: 0, failed: 0, skipped: 0 }
  for (const s of names) {
    const { schema, instance, connection } = this.getInfo(s)
    const spin = this.print.spinner({ showCounter: true }).start('rebuilding%s', schema.name)
    if (!instance) {
      spin.warn('clientInstanceNotConnected%s', schema.connection, schema.name)
      result.skipped++
      continue
    }
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
      if (connection.memory) spin.succeed('modelCreated%s', schema.name)
      else {
        const fixture = await addFixtures.call(this, schema.name, { spinner: spin })
        spin.succeed('modelCreatedWithFixture%s%s%s', schema.name, fixture.success, fixture.failed)
      }
      result.succed++
    } catch (err) {
      if (this.app.bajo.config.log.applet && this.app.bajo.config.log.level === 'trace') console.error(err)
      spin.fail('errorCreatingModel%s%s', schema.name, err.message)
      result.failed++
    }
  }
  this.print.info('succeedFailSkip%d%d%d', result.succed, result.failed, result.skipped)
  process.exit()
}

export default modelRebuild
