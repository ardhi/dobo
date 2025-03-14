async function upsert (name, input, opts = {}) {
  const { generateId } = this.app.bajo
  const { find } = this.app.bajo.lib._
  const { cloneDeep, omit } = this.app.bajo.lib._
  const options = cloneDeep(omit(opts, ['req', 'reply']))
  options.req = opts.req
  options.reply = opts.reply
  options.dataOnly = options.dataOnly ?? true
  await this.modelExists(name, true)
  const { schema } = this.getInfo(name)
  const idField = find(schema.properties, { name: 'id' })
  let id
  if (idField.type === 'string') id = input.id ?? generateId()
  else if (idField.type === 'integer') id = input.id ?? generateId('int')
  id = this.sanitizeId(id, schema)
  const old = await this.recordGet(name, id, { thrownNotFound: false, dataOnly: true, noHook: true, noCache: true, force: true, hidden: options.hidden, forceNoHidden: options.forceNoHidden })
  if (old) return await this.recordUpdate(name, id, input, options)
  return await this.recordCreate(name, input, options)
}

export default upsert
