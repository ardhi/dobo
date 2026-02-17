import path from 'path'
import driverFactory from './factory/driver.js'

/**
 * Collect all database drivers from loaded plugins
 *
 * @name collectDrivers
 * @memberof module:Lib
 * @async
 * @see Dobo#init
 */
async function collectDrivers () {
  const { eachPlugins, runHook } = this.app.bajo
  const { importModule } = this.app.bajo
  const { camelCase, isFunction } = this.app.lib._
  const DoboDriver = await driverFactory.call(this)

  this.log.trace('collecting%s', this.t('driver'))
  const me = this
  await runHook(`${this.ns}:beforeCollectDrivers`)
  await eachPlugins(async function ({ file }) {
    const name = camelCase(path.basename(file, '.js'))
    const factory = await importModule(file)
    if (!isFunction(factory)) this.fatal('invalidDriverClassFactory%s%s', this.ns, name)
    const Cls = await factory.call(this)
    const instance = new Cls(this, name)
    if (!(instance instanceof DoboDriver)) this.fatal('invalidDriverClass%s%s', this.ns, name)
    me.drivers.push(instance)
    me.log.trace('- %s:%s', this.ns, name)
  }, { glob: 'driver/*.js', prefix: this.ns })
  await runHook(`${this.ns}:afterCollectDrivers`)
  this.log.debug('collected%s%d', this.t('driver'), this.drivers.length)
}

export default collectDrivers
