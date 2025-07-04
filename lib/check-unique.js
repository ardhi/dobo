async function checkUnique ({ schema, body, id }) {
  const { isSet } = this.lib.aneka
  const { filter, map, set } = this.lib._
  const singles = map(filter(schema.properties, p => (p.index ?? {}).type === 'unique'), 'name')
  const opts = { noHook: true, noCache: true, thrownNotFound: false, forceNoHidden: true }
  let old = {}
  if (id) old = (await this.recordGet(schema.name, id, opts)) ?? {}
  for (const s of singles) {
    if (!isSet(body[s])) continue
    if (id && body[s] === old[s]) continue
    const query = set({}, s, body[s])
    const resp = await this.recordFind(schema.name, { query, limit: 1 }, opts)
    if (resp.length !== 0) {
      const details = [{ field: s, error: 'uniqueConstraintError', value: id }]
      throw this.error('uniqueConstraintError', { details, body })
    }
  }
  const multis = filter(schema.indexes, i => i.type === 'unique')
  for (const m of multis) {
    const query = {}
    let empty = true
    let same = true
    for (const f of m.fields) {
      if (body[f]) empty = false
      if (body[f] !== old[f]) same = false
      query[f] = body[f]
    }
    if (empty || same) continue
    const resp = await this.recordFind(schema.name, { query, limit: 1 }, { noHook: true, noCache: true, forceNoHidden: true })
    if (resp.length !== 0) {
      const details = map(m.fields, f => {
        return { field: f, error: 'Unique constraint error' }
      })
      throw this.error('Unique constraint error', { details, body })
    }
  }
}

export default checkUnique
