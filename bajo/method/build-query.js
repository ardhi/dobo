import nql from '@tryghost/nql'

async function buildQuery ({ filter, schema, options = {} } = {}) {
  const { trim, isString, isPlainObject } = this.app.bajo.lib._
  let query = {}
  if (isString(filter.query)) {
    if (trim(filter.query).startsWith('{')) query = JSON.parse(filter.query)
    else query = nql(filter.query).parse()
  } else if (isPlainObject(filter.query)) query = filter.query
  return query
}

export default buildQuery
