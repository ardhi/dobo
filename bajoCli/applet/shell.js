const mods = [
  { method: 'recordFind' },
  { method: 'recordGet' },
  { method: 'recordCreate' },
  { method: 'recordUpdate' },
  { method: 'recordRemove' },
  '-',
  { method: 'modelRebuild' },
  '-',
  { method: 'schema' },
  { method: 'connection' },
  '-',
  { method: 'quit' },
  '-'
]

async function shell ({ path, args, options }) {
  const { importPkg, importModule, resolvePath, currentLoc } = this.app.bajo
  const prompts = await importPkg('bajoCli:@inquirer/prompts')
  const { map, find, repeat, kebabCase } = this.app.bajo.lib._
  const { select, Separator, confirm } = prompts
  const choices = map(mods, m => m === '-' ? new Separator() : ({ value: m.method }))
  const dir = currentLoc(import.meta).dir
  for (;;) {
    const method = await select({
      message: this.print.write('Select method:'),
      choices
    })
    if (method === 'quit') {
      const answer = await confirm({
        message: this.print.write('Are you sure to quit?')
      })
      if (!answer) continue
      this.print.info('Quitting now, have a nice day!')
      process.kill(process.pid, 'SIGINT')
      return
    }
    console.log(repeat('-', 80))
    this.print.info('Running: %s', method)
    const mod = find(mods, { method })
    const file = `${dir}/${kebabCase(mod.method)}.js`
    const instance = await importModule(resolvePath(file))
    await instance.call(this, method, [])
    console.log(repeat('-', 80))
  }
}

export default shell
