import postProcess from './lib/post-process.js'

async function modelClear ({ path, args, options }) {
  const { print } = this.app.bajo
  const { isEmpty } = this.app.bajo.lib._
  if (isEmpty(this.schemas)) return print.fail('No schema found!', { exit: this.app.bajo.applet })
  const [schema] = args
  await postProcess.call(this, { handler: 'modelClear', params: [schema], path, processMsg: 'Clear records', options })
}

export default modelClear
