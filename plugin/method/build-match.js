function split (value, schema) {
  let [field, val] = value.split(':').map(i => i.trim())
  if (!val) {
    val = field
    field = '*'
  }
  return { field, value: val }
}

function buildMatch ({ input = '', schema, options }) {
  const { isPlainObject, trim } = this.app.bajo.lib._
  input = trim(input)
  let items = {}
  if (isPlainObject(input)) items = input
  else if (input[0] === '{') items = JSON.parse(input)
  else {
    for (const item of input.split('+').map(i => i.trim())) {
      const part = split.call(this, item, schema)
      if (!items[part.field]) items[part.field] = []
      items[part.field].push(...part.value.split(' ').filter(v => ![''].includes(v)))
    }
  }
  const matcher = {}
  for (const f of schema.fullText.fields) {
    const value = []
    if (typeof items[f] === 'string') items[f] = [items[f]]
    if (Object.prototype.hasOwnProperty.call(items, f)) value.push(...items[f])
    matcher[f] = value
  }
  if (Object.prototype.hasOwnProperty.call(items, '*')) matcher['*'] = items['*']
  return matcher
}

export default buildMatch
