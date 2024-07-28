async function singleRelRows ({ schema, record, options = {} }) {
  const { isSet } = this.app.bajo
  const props = schema.properties.filter(p => isSet(p.rel) && !(options.hidden ?? []).includes(p.name))
  const rels = {}
  options.rels = options.rels ?? []
  if (props.length > 0) {
    for (const prop of props) {
      for (const key in prop.rel) {
        if (!((typeof options.rels === 'string' && ['*', 'all'].includes(options.rels)) || options.rels.includes(key))) continue
        const val = prop.rel[key]
        if (val.fields.length === 0) continue
        const relschema = this.getSchema(val.schema)
        const relFilter = options.filter
        const query = {}
        query[val.propName] = record[prop.name]
        relFilter.query = query
        const relOptions = { dataOnly: true, rels: [] }
        const results = await this.recordFind(relschema.name, relFilter, relOptions)
        const fields = [...val.fields]
        if (!fields.includes(prop.name)) fields.push(prop.name)
        const data = []
        for (const res of results) {
          data.push(await this.pickRecord({ record: res, fields, schema: relschema }))
        }
        rels[key] = ['one-to-one'].includes(val.type) ? data[0] : data
      }
    }
  }
  record._rel = rels
}

export default singleRelRows
