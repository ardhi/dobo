async function sanitizeFixture ({ body = {}, lookupValue = {}, noLookup } = {}, options = {}) {
  const { isString, isArray, pullAt, cloneDeep } = this.app.lib._
  const { isSet } = this.app.lib.aneka
  const lv = cloneDeep(lookupValue)
  const deleted = {}
  const opts = {
    ...options,
    noModelHook: false,
    noHook: true,
    noDynHook: true,
    noValidation: false,
    noCache: true
  }
  for (const key in body) {
    const val = body[key]
    deleted[key] = deleted[key] ?? []
    if (!noLookup) {
      if (isString(val) && val.slice(0, 2) === '?:') {
        body[key] = await this._simpleLookup(val.slice(2), lv, opts)
        lv[key] = body[key]
      } else if (isArray(val)) {
        for (const idx in val) {
          if (isString(val[idx]) && val[idx].slice(0, 2) === '?:') {
            body[key][idx] = await this._simpleLookup(val[idx].slice(2), lv, opts)
            if (isSet(body[key][idx])) body[key][idx] += ''
            else deleted[key].push(idx)
            lv[`${key}.${idx}`] = body[key][idx]
          }
        }
        if (deleted[key].length > 0) pullAt(body[key], deleted[key])
      }
    }
    delete deleted[key]
    if (val === null) body[key] = undefined
    else {
      const prop = this.properties.find(item => item.name === key)
      if (prop && ['string', 'text'].includes(prop.type)) body[key] += ''
    }
  }
  return body
}

export default sanitizeFixture
