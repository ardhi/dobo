import path from 'path'

async function handler ({ file, alias, ns }) {
  const { importModule } = this.app.bajo
  const { camelCase, isFunction } = this.app.bajo.lib._
  let name = camelCase(path.basename(file, '.js'))
  if (ns !== this.name) name = `${ns}:${name}`
  const mod = await importModule(file)
  if (!isFunction(mod)) this.fatal('Feature \'%s\' should be an async function', name)
  this.feature = this.feature ?? {}
  this.feature[name] = mod
  this.log.trace('- %s', name)
}

async function collectFeature () {
  const { eachPlugins } = this.app.bajo
  this.feature = {}
  this.log.trace('Loading DB feature')
  await eachPlugins(handler, { glob: 'feature/*.js', baseNs: this.ns })
  this.log.debug('Total loaded features: %d', Object.keys(this.feature).length)
}

export default collectFeature
