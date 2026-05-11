import { getRefs, execHook, execModelHook, execDynHook, getFilterAndOptions, cloneOptions, sanitizeQuery } from './_util.js'
const action = 'findAllRecord'

async function native (...args) {
  const { isSet } = this.app.lib.aneka
  const { getDefaultValues, t } = this.app.dobo
  const { pick, omit, cloneDeep } = this.app.lib._
  const [params = {}, opts = {}] = args
  const { get, set } = this.app.bajoCache ?? {}
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { filter, options } = await getFilterAndOptions.call(this, params, opts, action)
  const { hardCap, warnings } = getDefaultValues(options)
  if (dataOnly) options.count = false
  const { noResultSanitizer } = options
  await execHook.call(this, 'beforeFindAllRecord', filter, options)
  await execModelHook.call(this, 'beforeFindAllRecord', filter, options)
  await execDynHook.call(this, 'beforeFindAllRecord', filter, options)
  filter.query = sanitizeQuery.call(this, filter.query)
  const cFilter = cloneDeep(filter)
  if (get) {
    const resp = await get({ model: this, action, filter: cFilter, options })
    if (resp) {
      resp.cached = true
      return dataOnly ? resp.data : resp
    }
  }
  let result = options.record ?? (await this.driver._findAllRecord(this, filter, options)) ?? {}
  result.limit = filter.limit
  result.filter = pick(filter, ['query', 'match', 'sort'])
  result.warnings = result.warnings ?? []
  if (!options.count) result = omit(result, ['count', 'pages'])
  else if (options.count && result.count > hardCap) {
    result.warnings.push(t('hardCapWarning%s%s', result.count, hardCap))
    result.count = hardCap
    result.hardCapped = true
  }
  result.pages = options.count ? Math.ceil(result.count / filter.limit) : undefined
  if (!warnings) delete result.warnings

  if (isSet(options.refs)) await getRefs.call(this, result.data, options)
  if (!noResultSanitizer) {
    for (const idx in result.data) {
      result.data[idx] = await this.sanitizeRecord(result.data[idx], options)
    }
  }
  await execDynHook.call(this, 'afterFindAllRecord', filter, result, options)
  await execModelHook.call(this, 'afterFindAllRecord', filter, result, options)
  await execHook.call(this, 'afterFindAllRecord', filter, result, options)
  if (set) await set({ model: this, action, filter: cFilter, options, result })
  return dataOnly ? result.data : result
}

async function loop (...args) {
  const { cloneDeep } = this.app.lib._
  const { getDefaultValues } = this.app.dobo
  const [params = {}, opts = {}] = args
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { filter, options } = await getFilterAndOptions.call(this, params, opts, action)
  const { maxLimit, hardCap, warnings: showWarnings } = getDefaultValues(options)
  const nFilter = cloneDeep(filter || {})
  const nOptions = cloneOptions.call(this, options)
  nOptions.count = false
  nOptions.dataOnly = false
  nFilter.limit = maxLimit
  nFilter.page = 1
  let count = 0
  const warnings = options.warnings ?? []
  const data = []
  for (;;) {
    const result = await this.findRecord(nFilter, nOptions)
    if (result.data.length === 0) break
    if (count + result.data.length > hardCap) {
      const sliced = result.data.slice(0, hardCap - count)
      warnings.push(options.req ? options.req.t('hardCapWarning%s%s', result.data.length, hardCap) : this.plugin.t('hardCapWarning%s%s', result.data.length, hardCap))
      data.push(...sliced)
      break
    }
    data.push(...result.data)
    count = count + result.data.length
    nFilter.page++
  }
  const result = { data, count, warnings }
  if (!showWarnings) delete result.warnings
  return dataOnly ? data : result
}

async function findAllRecord (...args) {
  // can't use action here, because people tends to use is without arguments
  // if (args.length === 0) return this.action(action, ...args)
  if (this.driver.findAllRecord) {
    return await native.call(this, ...args)
  }
  return await loop.call(this, ...args)
}

export default findAllRecord
