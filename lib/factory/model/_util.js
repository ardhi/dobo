import path from 'path'
import nql from '@tryghost/nql'

export async function execHook (name, ...args) {
  const { runHook } = this.app.bajo
  const { camelCase, last } = this.app.lib._
  const { noHook } = last(args)
  const { ns } = this.app.dobo
  if (!noHook) {
    await runHook(`${ns}:${name}`, this.name, ...args)
    await runHook(`${ns}.${camelCase(this.name)}:${name}`, ...args)
  }
}

export async function execModelHook (name, ...args) {
  if (['beforeBuildQuery', 'beforeBuildSearch', 'afterBuildQuery', 'afterBuildSearch'].includes(name)) return
  const { last } = this.app.lib._
  const { runModelHook } = this.app.dobo
  const { noModelHook } = last(args)
  if (!noModelHook) await runModelHook(this, name, ...args)
}

export async function execDynHook (name, ...args) {
  const { last, orderBy } = this.app.lib._
  const opts = last(args)
  const results = []
  if (!opts.noDynHook) {
    const hooks = orderBy((opts.dynHooks ?? []).filter(hook => hook.name === name), ['level'])
    for (const hook of hooks) {
      if (hook.noWait) hook.handler.call(this, ...args)
      else await hook.handler.call(this, ...args)
    }
  }
  return results
}

export async function execValidation (body, options = {}) {
  const { uniq } = this.app.lib._
  const { validation = {}, extFields = [], partial, req } = options
  const fields = uniq([...Object.keys(body), ...(options.fields ?? [])])
  await execHook.call(this, 'beforeRecordValidation', body, options)
  const result = await this.validate(body, validation, { fields, extFields, partial, req })
  await execHook.call(this, 'afterRecordValidation', body, result, options)
  return result
}

/**
 * Break any reference to the original and get the new options
 *
 * @param {Object} options
 * @returns {Object}
 */
export async function getFilterAndOptions (filter = {}, options = {}, action) {
  const { cloneDeep, omit } = this.app.lib._
  const { runModelHook } = this.app.dobo
  const keys = ['req', 'reply']
  const nFilter = cloneDeep(omit(filter, keys))
  const nOptions = cloneDeep(omit(options, keys))
  nOptions.action = action
  nOptions.dataOnly = false
  nOptions.truncateString = nOptions.truncateString ?? false
  nOptions.throwNotFound = nOptions.throwNotFound ?? true
  for (const key of keys) {
    nOptions[key] = options[key]
  }
  nFilter.orgQuery = nFilter.query
  nFilter.orgSearch = nFilter.search
  if (!nOptions.noModelHook) await runModelHook(this, 'beforeBuildQuery', nFilter.query, nOptions)
  nFilter.query = buildFilterQuery.call(this, nFilter) ?? {}
  if (!nOptions.noModelHook) await runModelHook(this, 'afterBuildQuery', nFilter.query, nOptions)
  if (!nOptions.noModelHook) await runModelHook(this, 'beforeBuilSearch', nFilter.search, nOptions)
  nFilter.search = buildFilterSearch.call(this, nFilter) ?? {}
  if (!nOptions.noModelHook) await runModelHook(this, 'afterBuildSearch', nFilter.search, nOptions)
  if (this.driver.idField.name !== 'id') replaceIdInQuerySearch.call(this, nFilter)
  const { limit, page, skip, sort } = preparePagination.call(this, nFilter, nOptions)
  nFilter.limit = limit
  nFilter.page = page
  nFilter.skip = skip
  nFilter.sort = sort
  if (nOptions.queryHandler) {
    const scope = nOptions.req ? this.app[nOptions.req.ns] : this.plugin
    nFilter.query = await options.queryHandler.call(scope, nFilter.query, nOptions.req)
  }
  return { filter: nFilter, options: nOptions }
}

export async function handleReq (id, trigger, options = {}) {
  const { upperFirst } = this.app.lib._
  if (options.req) {
    if (options.req.file && trigger !== 'removed') await handleAttachmentUpload.call(this, id, trigger, options)
    if (options.req.flash && !options.noFlash) options.req.flash('notify', options.req.t(`record${upperFirst(trigger)}`))
  }
}

export async function mergeAttachmentInfo (rec, source, options = {}) {
  if (!this.app.waibu) return
  const { mimeType, stats, fullPath } = options
  const { importPkg } = this.app.bajo
  const { fs } = this.app.lib
  const { pick } = this.app.lib._
  const mime = await importPkg('waibu:mime')

  if (mimeType) rec.mimeType = mime.getType(rec.file)
  if (fullPath) rec.fullPath = source
  if (stats) {
    const s = fs.statSync(source)
    rec.stats = pick(s, ['size', 'atime', 'ctime', 'mtime'])
  }
}

export async function getAttachmentPath (id, fieldName, file, options = {}) {
  const { getPluginDataDir } = this.app.bajo
  const { fs } = this.app.lib
  const dir = `${getPluginDataDir(this.app.dobo.ns)}/attachment/${this.name}/${id}`
  if (options.dirOnly) return dir
  const path = fieldName ? `${dir}/${fieldName}/${file}` : `${dir}/${file}`
  if (!fs.existsSync(path)) throw this.app.dobo.error('notFound')
  return path
}

export async function copyAttachment (id, options = {}) {
  if (!this.app.waibu) return
  if (!this.attachment) return
  const { fs } = this.app.lib
  const { req, setField, setFile, mimeType, stats } = options
  const { dir, files } = await this.app.waibu.getUploadedFiles(req.id, false, true)
  const result = []
  if (files.length === 0) return result
  for (const f of files) {
    let [fieldName, ...parts] = path.basename(f).split('@')
    if (parts.length === 0) continue
    fieldName = setField ?? fieldName
    const file = setFile ?? parts.join('@')
    const opts = { source: f, fieldName, file, mimeType, stats, req }
    const rec = await this.createAttachment(id, opts)
    if (!rec) continue
    delete rec.dir
    result.push(rec)
    if (setField || setFile) break
  }
  fs.removeSync(dir)
  return result
}

export async function handleAttachmentUpload (id, trigger, options = {}) {
  if (!this.attachment) return
  const { getPluginDataDir } = this.app.bajo
  const { fs } = this.app.lib
  const { req, mimeType, stats, setFile, setField } = options
  if (trigger === 'removed') {
    const dir = `${getPluginDataDir(this.app.dobo.ns)}/attachment/${this.name}/${id}`
    await fs.remove(dir)
    return
  }
  return copyAttachment.call(this, id, { req, mimeType, stats, setFile, setField })
}

export async function getSingleRef (record = {}, options = {}) {
  const { isSet } = this.app.lib.aneka
  const { get } = this.app.lib._
  const props = this.properties.filter(p => isSet(p.ref) && !(options.hidden ?? []).includes(p.name))
  const refs = {}
  options.refs = options.refs ?? []
  if (props.length > 0) {
    for (const prop of props) {
      for (const key in prop.ref) {
        if (!((typeof options.refs === 'string' && ['*', 'all'].includes(options.refs)) || options.refs.includes(key))) continue
        const ref = prop.ref[key]
        if (ref.fields.length === 0) continue
        if (get(record, `_ref.${key}`)) continue
        const rModel = this.app.dobo.getModel(ref.model)
        const query = {}
        query[ref.propName] = record[prop.name]
        if (ref.propName === 'id') query[ref.propName] = this.sanitizeId(query[ref.propName])
        const rFilter = { query }
        const rOptions = { dataOnly: true, refs: [] }
        const results = await rModel.findRecord(rFilter, rOptions)
        const fields = [...ref.fields]
        const data = []
        for (const res of results) {
          data.push(await rModel.sanitizeRecord(res, { fields }))
        }
        refs[key] = ['1:1'].includes(ref.type) ? data[0] : data
      }
    }
  }
  record._ref = refs
}

export async function getMultiRefs (records = [], options = {}) {
  const { isSet } = this.app.lib.aneka
  const { uniq, without, get } = this.app.lib._
  const props = this.properties.filter(p => isSet(p.ref) && !(options.hidden ?? []).includes(p.name))
  options.refs = options.refs ?? []
  if (props.length > 0) {
    for (const prop of props) {
      for (const key in prop.ref) {
        if (!((typeof options.refs === 'string' && ['*', 'all'].includes(options.refs)) || options.refs.includes(key))) continue
        const ref = prop.ref[key]
        if (ref.fields.length === 0) continue
        if (ref.type !== '1:1') continue
        if (get(records, `0._ref.${key}`)) continue
        const rModel = this.app.dobo.getModel(ref.model)
        let matches = []
        for (const r of records) {
          matches.push(rModel.sanitizeId(r[prop.name]))
        }
        matches = uniq(without(matches, undefined, null, NaN))
        const query = {}
        query[ref.propName] = { $in: matches }
        const rFilter = { query, limit: matches.length }
        const rOptions = { dataOnly: true, refs: [] }
        const results = await rModel.findRecord(rFilter, rOptions)
        const fields = [...ref.fields]
        if (!fields.includes(prop.name)) fields.push(prop.name)
        for (const i in records) {
          records[i]._ref = records[i]._ref ?? {}
          const rec = records[i]
          const res = results.find(res => (res[ref.propName] + '') === rec[prop.name] + '')
          if (res) records[i]._ref[key] = await rModel.sanitizeRecord(res, { fields })
          else records[i]._ref[key] = {}
        }
      }
    }
  }
}

export function buildFilterQuery (filter = {}) {
  const { trim, find, isString, isPlainObject } = this.app.lib._
  let query = filter.query ?? {}
  let q = {}
  if (isString(query)) {
    try {
      query = trim(query)
      if (query.startsWith('{')) q = JSON.parse(query) // JSON formatted query
      else if (query.includes(':')) q = nql(query).parse() // NQL
      else if (this.driver.support.search) {
        filter.search = q
        return {} //
      } else {
        let scanables = [...this.scanables]
        if (scanables.length === 0) scanables = [...this.sortables]
        const fields = scanables.filter(f => {
          const field = find(this.properties, { name: f, type: 'string' })
          return !!field
        })
        const parts = fields.map(f => {
          if (query[0] === '*') return `${f}:~$'${query.replaceAll('*', '')}'`
          if (query[query.length - 1] === '*') return `${f}:~^'${query.replaceAll('*', '')}'`
          return `${f}:~'${query.replaceAll('*', '')}'`
        })
        if (parts.length === 1) q = nql(parts[0]).parse()
        else if (parts.length > 1) q = nql(parts.join(',')).parse()
      }
    } catch (err) {
      this.plugin.error('invalidQuery', { orgMessage: err.message })
    }
  } else if (isPlainObject(query)) q = query
  return sanitizeQuery.call(this, q)
}

function sanitizeQuery (query = {}, parent) {
  const { isPlainObject, isArray, find, cloneDeep } = this.app.lib._
  const { isSet } = this.app.lib.aneka
  const { dayjs } = this.app.lib
  const obj = cloneDeep(query)
  const keys = Object.keys(obj)

  const sanitizeField = (prop, val) => {
    if (!prop) return val
    if (val instanceof RegExp) return val
    if (['datetime'].includes(prop.type)) {
      const dt = dayjs(val)
      return dt.isValid() ? dt.toDate() : val
    } else if (['smallint', 'integer'].includes(prop.type)) return parseInt(val) || val
    else if (['float', 'double'].includes(prop.type)) return parseFloat(val) || val
    else if (['boolean'].includes(prop.type)) return !!val
    else if (['string', 'text'].includes(prop.type)) return val + ''
    return val
  }

  const sanitizeChild = (key, val, p) => {
    if (!isSet(val)) return val
    const prop = find(this.properties, { name: key.startsWith('$') ? p : key })
    if (!prop) return val
    return sanitizeField(prop, val)
  }

  keys.forEach(k => {
    const v = obj[k]
    const prop = find(this.properties, { name: k })
    if (isPlainObject(v)) obj[k] = sanitizeQuery.call(this, v, k)
    else if (isArray(v)) {
      v.forEach((i, idx) => {
        if (isPlainObject(i)) obj[k][idx] = sanitizeQuery.call(this, i, k)
        else obj[k][idx] = sanitizeField(prop, i)
      })
    } else obj[k] = sanitizeChild(k, v, parent)
  })
  return obj
}

export function buildFilterSearch (filter = {}) {
  const { isPlainObject, trim, has, uniq } = this.app.lib._
  const search = filter.search ?? {}
  let input = search
  if (isPlainObject(input)) return input
  const split = (value) => {
    let [field, val] = value.split(':').map(i => i.trim())
    if (!val) {
      val = field
      field = '*'
    }
    return { field, value: val }
  }
  input = trim(input)
  let items = {}
  if (isPlainObject(input)) items = input
  else if (input[0] === '{') {
    try {
      items = JSON.parse(input)
    } catch (err) {}
  } else {
    for (const item of input.split('+').map(i => i.trim())) {
      const part = split(item, ' ')
      if (!items[part.field]) items[part.field] = []
      items[part.field].push(...part.value.split(' ').filter(v => ![''].includes(v)))
    }
  }
  const s = {}
  for (const index of this.indexes.filter(i => i.type === 'fulltext')) {
    for (const f of index.fields) {
      const value = []
      if (typeof items[f] === 'string') items[f] = [items[f]]
      if (has(items, f)) value.push(...items[f])
      if (!s[f]) s[f] = []
      s[f] = uniq([...s[f], ...value])
    }
  }
  if (has(items, '*')) s['*'] = items['*']
  return s
}

export function replaceIdInQuerySearch (filter) {
  // query
  const query = JSON.stringify(filter.query ?? {}, (key, value) => {
    if (value instanceof RegExp) return ['__REGEXP__', value.source, value.flags]
    return value
  }).replaceAll('"id"', `"${this.driver.idField.name}"`)
  try {
    filter.query = JSON.parse(query, (key, value) => {
      if (Array.isArray(value) && value[0] === '__REGEXP__') return new RegExp(value[1], value[2])
      return value
    })
  } catch (err) {}
  // search
  const search = JSON.stringify(filter.search ?? {}).replaceAll('"id"', `"${this.driver.idField.name}"`)
  try {
    filter.search = JSON.parse(search)
  } catch (err) {}
}

/**
 * Prepare records pagination:
 * - making sure records limit is obeyed
 * - making sure page is a positive value
 * - if skip is given, recalculate limit to use skip instead of page number
 * - Build sort info
 *
 * @method
 * @async
 * @param {Object} [filter={}] - Filter object
 * @param {Object} options - Options
 * @returns {TRecordPagination}
 */
export function preparePagination (filter = {}, options = {}) {
  const { isEmpty, map, each, isPlainObject, isString, trim, keys } = this.app.lib._
  const config = this.app.dobo.config

  const buildPageSkipLimit = (filter) => {
    let limit = parseInt(filter.limit) || config.default.filter.limit
    if (limit === -1) limit = config.default.filter.maxLimit
    if (limit > config.default.filter.maxLimit) limit = config.default.filter.maxLimit
    if (limit < 1) limit = 1
    let page = parseInt(filter.page) || 1
    if (page < 1) page = 1
    let skip = (page - 1) * limit
    if (filter.skip) {
      skip = parseInt(filter.skip) || skip
      page = undefined
    }
    if (skip < 0) skip = 0
    return { page, skip, limit }
  }

  const buildSort = (input, allowSortUnindexed) => {
    let sort
    if (isEmpty(input)) {
      const columns = map(this.properties ?? [], 'name')
      each(config.default.filter.sort, s => {
        const [col] = s.split(':')
        if (columns.includes(col)) {
          input = s
          return false
        }
      })
    }
    if (!isEmpty(input)) {
      if (isPlainObject(input)) sort = input
      else if (isString(input)) {
        const item = {}
        each(input.split('+'), text => {
          let [col, dir] = map(trim(text).split(':'), i => trim(i))
          dir = (dir ?? '').toUpperCase()
          dir = dir === 'DESC' ? -1 : parseInt(dir) || 1
          item[col] = dir / Math.abs(dir)
        })
        sort = item
      }
      const items = keys(sort)
      each(items, i => {
        if (!this.sortables.includes(i) && !allowSortUnindexed) throw this.app.dobo.error('sortOnUnindexedField%s%s', i, this.name)
        // if (model.fullText.fields.includes(i)) throw this.error('Can\'t sort on full-text index: \'%s@%s\'', i, model.name)
      })
    }
    return sort
  }

  const { page, skip, limit } = buildPageSkipLimit(filter)
  let sortInput = filter.sort
  try {
    sortInput = JSON.parse(sortInput)
  } catch (err) {
  }
  const sort = buildSort(sortInput, options.allowSortUnindexed)
  return { limit, page, skip, sort }
}
