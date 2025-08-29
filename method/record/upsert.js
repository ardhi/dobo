/**
 * Update a record by payload's ID. If no record is found by given ID, a new one will be created instead.
 *
 * Missing ID in payload always results a new record creation.
 * ```
 *
 * @method
 * @memberof Dobo
 * @async
 * @instance
 * @name recordUpsert
 * @param {string} name - Model's name
 * @param {Object} body - Body payload
 * @param {TRecordUpsertOptions} [options={}]
 * @returns {(TRecordUpdateResult|TRecordCreateResult|Object)} Returns updated/newly created record if ```options.dataOnly``` is set. {@link TRecordUpdateResult} or {@link TRecordCreateResult} otherwise
 */
async function upsert (name, input, opts = {}) {
  const { generateId } = this.app.bajo
  const { find } = this.lib._
  const { cloneDeep, omit, merge } = this.lib._
  const { query, omitOnUpdate = [], omitOnCreate = [] } = opts
  const options = cloneDeep(omit(opts, ['req', 'reply', 'query', 'omitOnUpdate', 'omitOnCreate']))
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
  let old
  let body
  const o = { dataOnly: true, noHook: true, noCache: true, hidden: options.hidden, forceNoHidden: options.forceNoHidden }
  if (query) {
    old = await this.recordFindOne(name, { query }, o)
  } else {
    o.thrownNotFound = false
    old = await this.recordGet(name, id, o)
  }
  if (old) {
    body = merge(omit(old, ['id', 'createdAt', 'updatedAt', 'removedAt']), omit(input, omitOnUpdate))
    return await this.recordUpdate(name, old.id, body, options)
  }
  if (!query) input.id = id
  body = omit(input, omitOnCreate)
  return await this.recordCreate(name, body, options)
}

export default upsert
