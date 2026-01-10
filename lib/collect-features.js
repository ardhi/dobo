import path from 'path'
import featureFactory from './factory/feature.js'

/**
 * Object to be passed as feature input in ```{model}.features```
 *
 * @typedef TFeatureInput
 * @memberof module:Lib
 * @property {string} name - Accept ```TNsPath```. If standard string is given, ```ns``` is set to ```dobo```
 * @property {any} [param]
 */

/**
 * Collect all database features from all loaded plugins
 *
 * @name collectFeatures
 * @memberof module:Lib
 * @async
 * @see Dobo#init
 */
async function collectFeature () {
  const { eachPlugins } = this.app.bajo
  const DoboFeature = await featureFactory.call(this)

  this.log.trace('collecting%s', this.t('feature'))
  const me = this
  await eachPlugins(async function ({ file }) {
    const { importModule } = this.app.bajo
    const { camelCase, isFunction } = this.app.lib._

    const name = camelCase(path.basename(file, '.js'))
    const handler = await importModule(file)
    if (!isFunction(handler)) this.fatal('invalidFeatureHandler%s%s', this.ns, name)
    me.features.push(new DoboFeature(this, { name, handler }))
    me.log.trace('- %s:%s', this.ns, name)
  }, { glob: 'feature/*.js', prefix: this.ns })
  this.log.debug('collected%s%d', this.t('feature'), this.features.length)
}

export default collectFeature
