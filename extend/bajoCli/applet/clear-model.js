import postProcess from './lib/post-process.js'

async function modelClear (path, ...args) {
  const { print } = this.app.bajo
  const { isEmpty } = this.app.lib._
  const { parseKvString } = this.app.lib.aneka
  if (isEmpty(this.models)) return print.fail('notFound%s', 'model', { exit: this.app.applet })
  let [model, options] = args
  options = isEmpty(options) ? {} : parseKvString(options)
  await postProcess.call(this, { handler: path, params: [model, options], path, processMsg: 'Clear records' })
}

export default modelClear
