async function multiRelRows ({ schema, records, options = {} }) {
  const { isSet } = this.lib.aneka
  const { uniq, find, map } = this.lib._
  const props = schema.properties.filter(p => isSet(p.rel) && !(options.hidden ?? []).includes(p.name))
  // const props = schema.properties.filter(p => isSet(p.rel))
  options.rels = options.rels ?? []
  if (props.length > 0) {
    for (const prop of props) {
      for (const key in prop.rel) {
        if (!((typeof options.rels === 'string' && ['*', 'all'].includes(options.rels)) || options.rels.includes(key))) continue
        const val = prop.rel[key]
        if (val.fields.length === 0) continue
        if (val.type !== 'one-to-one') continue
        const relschema = this.getSchema(val.schema)
        const matches = uniq(map(records, r => {
          let v = r[prop.name]
          if (val.propName === 'id') {
            const idField = find(relschema.properties, { name: 'id' })
            if (idField.type === 'integer') v = parseInt(v)
          }
          return v
        }))
        const query = {}
        query[val.propName] = { $in: matches }
        const relFilter = { query, limit: matches.length }
        const relOptions = { dataOnly: true, rels: [] }
        const results = await this.recordFind(relschema.name, relFilter, relOptions)
        const fields = [...val.fields]
        if (!fields.includes(prop.name)) fields.push(prop.name)
        for (const i in records) {
          records[i]._rel = records[i]._rel ?? {}
          const rec = records[i]
          const res = results.find(r => (r[val.propName] + '') === rec[prop.name] + '')
          if (res) records[i]._rel[key] = await this.pickRecord({ record: res, fields, schema: relschema })
          else records[i]._rel[key] = {}
        }
      }
    }
  }
}

export default multiRelRows
