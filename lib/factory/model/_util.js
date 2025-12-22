import path from 'path'
import nql from '@tryghost/nql'

export async function execHook (name, ...args) {
  const { runHook } = this.app.bajo
  const { camelCase, last } = this.app.lib._
  const { noHook } = last(args)
  const { ns } = this.plugin
  if (!noHook) {
    await runHook(`${ns}:${name}`, this.name, ...args)
    await runHook(`${ns}.${camelCase(this.name)}:${name}`, ...args)
  }
}

export async function execModelHook (name, ...args) {
  const { last } = this.app.lib._
  const { noModelHook } = last(args)
  const results = []
  if (!noModelHook) {
    const hooks = this.hooks.filter(hook => hook.name === name)
    for (const hook of hooks) {
      await hook.handler(...args)
    }
  }
  return results
}

export async function execValidation (body, options = {}) {
  const { uniq } = this.app.lib._
  const { validation = {}, extFields = [] } = options
  const fields = uniq([...Object.keys(body), ...(options.fields ?? [])])
  await execHook.call(this, 'beforeRecordValidation', this.name, body, options)
  const result = await this.validate(body, validation, { fields, extFields })
  await execHook.call(this, 'afterRecordValidation', this.name, body, result, options)
  return result
}

/**
 * Break any reference to the original and get the new options
 *
 * @param {Object} options
 * @returns {Object}
 */
export function getFilterAndOptions (filter = {}, options = {}) {
  const { cloneDeep, omit } = this.app.lib._
  const keys = ['req', 'reply']
  const nFilter = cloneDeep(omit(filter, keys))
  const nOptions = cloneDeep(omit(options, keys))
  nOptions.dataOnly = false
  nOptions.truncateString = nOptions.truncateString ?? false
  for (const key of keys) {
    nOptions[key] = options[key]
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

export async function getAttachmentPath (id, field, file, options = {}) {
  const { getPluginDataDir } = this.app.bajo
  const { fs } = this.app.lib
  const dir = `${getPluginDataDir(this.plugin.ns)}/attachment/${this.name}/${id}`
  if (options.dirOnly) return dir
  const path = field ? `${dir}/${field}/${file}` : `${dir}/${file}`
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
    let [field, ...parts] = path.basename(f).split('@')
    if (parts.length === 0) continue
    field = setField ?? field
    const file = setFile ?? parts.join('@')
    const opts = { source: f, field, file, mimeType, stats, req, silent: true }
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
    const dir = `${getPluginDataDir(this.ns)}/attachment/${this.name}/${id}`
    await fs.remove(dir)
    return
  }
  return this.copyAttachment(id, { req, mimeType, stats, setFile, setField })
}

export async function getSingleRef (record = {}, options = {}) {
  const { isSet } = this.app.lib.aneka
  const props = this.properties.filter(p => isSet(p.ref) && !(options.hidden ?? []).includes(p.name))
  const refs = {}
  options.refs = options.refs ?? []
  if (props.length > 0) {
    for (const prop of props) {
      for (const key in prop.ref) {
        if (!((typeof options.refs === 'string' && ['*', 'all'].includes(options.refs)) || options.refs.includes(key))) continue
        const ref = prop.ref[key]
        if (ref.fields.length === 0) continue
        const rModel = this.plugin.getModel(key)
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
  const { uniq, map } = this.app.lib._
  const props = this.properties.filter(p => isSet(p.ref) && !(options.hidden ?? []).includes(p.name))
  options.refs = options.refs ?? []
  if (props.length > 0) {
    for (const prop of props) {
      for (const key in prop.ref) {
        if (!((typeof options.refs === 'string' && ['*', 'all'].includes(options.refs)) || options.refs.includes(key))) continue
        const ref = prop.ref[key]
        if (ref.fields.length === 0) continue
        if (ref.type !== '1:1') continue
        const rModel = this.plugin.getModel(key)
        const matches = uniq(map(records, r => {
          let v = r[prop.name]
          if (ref.propName === 'id') v = this.sanitizeId(v)
          return v
        }))
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

export function buildFilterQuery (filter, options = {}) {
  const { trim, find, isString, isPlainObject } = this.app.lib._
  let query = {}
  if (isString(filter.query)) {
    try {
      filter.query = trim(filter.query)
      filter.orgQuery = filter.query
      if (trim(filter.query).startsWith('{')) query = JSON.parse(filter.query)
      else if (filter.query.includes(':')) query = nql(filter.query).parse()
      else {
        const fields = this.sortables.filter(f => {
          const field = find(this.properties, { name: f, type: 'string' })
          return !!field
        })
        const parts = fields.map(f => {
          if (filter.query[0] === '*') return `${f}:~$'${filter.query.replaceAll('*', '')}'`
          if (filter.query[filter.length - 1] === '*') return `${f}:~^'${filter.query.replaceAll('*', '')}'`
          return `${f}:~'${filter.query.replaceAll('*', '')}'`
        })
        if (parts.length === 1) query = nql(parts[0]).parse()
        else if (parts.length > 1) query = nql(parts.join(',')).parse()
      }
    } catch (err) {
      this.app.dobo.error('invalidQuery', { orgMessage: err.message })
    }
  } else if (isPlainObject(filter.query)) query = filter.query
  return sanitizeQuery.call(this, query)
}

function sanitizeQuery (query, parent) {
  const { cloneDeep, isPlainObject, isArray, find } = this.app.lib._
  const { isSet } = this.app.lib.aneka
  const { dayjs } = this.app.lib
  const obj = cloneDeep(query)
  const keys = Object.keys(obj)
  const sanitize = (key, val, p) => {
    if (!isSet(val)) return val
    const prop = find(this.properties, { name: key.startsWith('$') ? p : key })
    if (!prop) return val
    if (['datetime', 'date', 'time'].includes(prop.type)) {
      const dt = dayjs(val)
      return dt.isValid() ? dt.toDate() : val
    } else if (['smallint', 'integer'].includes(prop.type)) return parseInt(val) || val
    else if (['float', 'double'].includes(prop.type)) return parseFloat(val) || val
    else if (['boolean'].includes(prop.type)) return !!val
    return val
  }
  keys.forEach(k => {
    const v = obj[k]
    if (isPlainObject(v)) obj[k] = sanitizeQuery.call(this, v, k)
    else if (isArray(v)) {
      v.forEach((i, idx) => {
        if (isPlainObject(i)) obj[k][idx] = sanitizeQuery.call(this, i, k)
      })
    } else obj[k] = sanitize(k, v, parent)
  })
  return obj
}

export function buildFilterMatch (filter = {}, options = {}) {
  const { isPlainObject, trim, has, uniq } = this.app.lib._
  let input = filter.match
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
  const matcher = {}
  for (const index of this.indexes.filter(i => i.type === 'fulltext')) {
    for (const f of index.fields) {
      const value = []
      if (typeof items[f] === 'string') items[f] = [items[f]]
      if (has(items, f)) value.push(...items[f])
      if (!matcher[f]) matcher[f] = []
      matcher[f] = uniq([...matcher[f], ...value])
    }
  }
  if (has(items, '*')) matcher['*'] = items['*']
  return matcher
}

export async function buildQueryAndMatchFilter (filter = {}, options = {}) {
  filter.query = buildFilterQuery.call(this, filter, options) ?? {}
  if (options.queryHandler) {
    const scope = options.req ? this.app[options.req.ns] : this.plugin
    filter.query = await options.queryHandler.call(scope, filter.query, options.req)
  }
  filter.match = buildFilterMatch.call(this, filter, options) ?? {}
}
