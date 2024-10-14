async function transform ({ record, schema, hidden = [] } = {}) {
  const { dayjs } = this.app.bajo.lib
  if (record._id) {
    record.id = record._id
    delete record._id
  }
  const defHidden = [...schema.hidden, ...hidden]
  const result = {}
  for (const p of schema.properties) {
    if (defHidden.includes(p.name)) continue
    result[p.name] = record[p.name] ?? null
    if (record[p.name] === null) continue
    switch (p.type) {
      case 'time': result[p.name] = dayjs(record[p.name]).format('HH:mm:ss'); break
      case 'date': result[p.name] = dayjs(record[p.name]).format('YYYY-MM-DD'); break
      case 'datetime': result[p.name] = dayjs(record[p.name]).toISOString(); break
    }
  }
  return await this.sanitizeBody({ body: result, schema, partial: true, ignoreNull: true })
}

async function pickRecord ({ record, fields, schema = {}, hidden = [] } = {}) {
  const { isArray, pick, clone, isEmpty, omit } = this.app.bajo.lib._
  if (isEmpty(record)) return record
  if (hidden.length > 0) record = omit(record, hidden)
  if (!isArray(fields)) return await transform.call(this, { record, schema, hidden })
  const fl = clone(fields)
  if (!fl.includes('id')) fl.unshift('id')
  return pick(await transform.call(this, { record, schema, hidden }), fl)
}

export default pickRecord
