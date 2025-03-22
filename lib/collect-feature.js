import path from 'path'

async function handler ({ file, alias, ns }) {
  const { importModule } = this.app.bajo
  const { camelCase, isFunction } = this.lib._
  const me = this.app.dobo

  let name = camelCase(path.basename(file, '.js'))
  if (ns !== me.name) name = `${ns}.${name}`
  const mod = await importModule(file)
  if (!isFunction(mod)) this.fatal('featureNotAsync%s', name)
  me.feature[name] = mod
  me.log.trace('- %s', name)
}

async function collectFeature () {
  const { eachPlugins } = this.app.bajo
  this.feature = {}
  this.log.trace('loadingDbFeature')
  await eachPlugins(handler, { glob: 'feature/*.js', prefix: this.name })
  this.log.debug('totalLoadedFeatures%d', Object.keys(this.feature).length)
}

export default collectFeature
