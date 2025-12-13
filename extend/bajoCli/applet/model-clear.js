import postProcess from './lib/post-process.js'

async function modelClear (path, ...args) {
  const { print } = this.app.bajo
  const { isEmpty } = this.app.lib._
  if (isEmpty(this.schemas)) return print.fail('notFound%s', 'schema', { exit: this.app.applet })
  const [schema] = args
  await postProcess.call(this, { handler: path, params: [schema], path, processMsg: 'Clear records' })
}

export default modelClear
