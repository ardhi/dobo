/**
 * Sanitize a fixture object by resolving lookup values and ensuring proper data types.
 * @method
 * @async
 * @memberof DoboModel
 * @param {Object} [params={}] - Parameters object
 * @param {Object} [params.body={}] - Body object to sanitize
 * @param {Object} [params.lookupValue={}] - Lookup values for resolving references in the body
 * @param {boolean} [params.noLookup=false] - If `true`, skip lookup resolution
 * @param {DoboModel.TOptions} [opts={}] - Options object for additional configurations
 * @returns {Object} Returns sanitized body object
 */
async function sanitizeFixture (params = {}, opts = {}) {
  const { body = {}, lookupValue = {}, noLookup } = params
  const { isString, isArray, pullAt, cloneDeep } = this.app.lib._
  const { isSet } = this.app.lib.aneka
  const lv = cloneDeep(lookupValue)
  const deleted = {}
  const options = {
    ...opts,
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
        body[key] = await this._simpleLookup(val.slice(2), lv, options)
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
