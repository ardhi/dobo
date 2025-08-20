import postProcess from './lib/post-process.js'

async function modelClear (...args) {
  const { print } = this.app.bajo
  const { isEmpty } = this.lib._
  if (isEmpty(this.schemas)) return print.fail('notFound%s', 'schema', { exit: this.app.bajo.applet })
  const [schema] = args
  await postProcess.call(this, { handler: 'modelClear', params: [schema], path: 'modelClear', processMsg: 'Clear records' })
}

export default modelClear
