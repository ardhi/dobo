import { getMultiRefs, execHook, execModelHook, execDynHook, getFilterAndOptions, cloneOptions } from './_util.js'
const action = 'findAllRecord'

async function native (...args) {
  const { isSet } = this.app.lib.aneka
  const { cloneDeep } = this.app.lib._
  const [params = {}, opts = {}] = args
  const { dataOnly = true } = opts
  const { get: getCache, set: setCache } = this.app.bajoCache ?? {}
  const { filter, options } = await getFilterAndOptions.call(this, params, opts, action)
  if (dataOnly) options.count = false
  let { noResultSanitizer, noCache } = options
  await execHook.call(this, 'beforeFindRecord', filter, options)
  await execModelHook.call(this, 'beforeFindRecord', filter, options)
  await execDynHook.call(this, 'beforeFindRecord', filter, options)
  if (this.cache.ttlDur === 0 || options.record) noCache = true
  const cacheFilter = cloneDeep(filter)
  if (!noCache && getCache) {
    const result = await getCache({ model: this, filter: cacheFilter, options })
    if (result) {
      for (const idx in result.data) {
        result.data[idx] = await this.sanitizeRecord(result.data[idx], options)
      }
      result.cached = true
      return dataOnly ? result.data : result
    }
  }
  const result = options.record ?? (await this.driver._findAllRecord(this, filter, options)) ?? {}
  if (!noResultSanitizer) {
    for (const idx in result.data) {
      result.data[idx] = await this.sanitizeRecord(result.data[idx], options)
    }
  }
  if (isSet(options.refs)) await getMultiRefs.call(this, result.data, options)
  await execDynHook.call(this, 'afterFindRecord', filter, result, options)
  await execModelHook.call(this, 'afterFindRecord', filter, result, options)
  await execHook.call(this, 'afterFindRecord', filter, result, options)
  if (!noCache && setCache) {
    await setCache({ model: this, filter: cacheFilter, result, options })
    result.cached = false
  }
  return dataOnly ? result.data : result
}

async function loop (...args) {
  const { cloneDeep } = this.app.lib._
  const [params = {}, opts = {}] = args
  const { dataOnly = true } = opts
  const { filter, options } = await getFilterAndOptions.call(this, params, opts, action)
  const { maxLimit, hardLimit } = this.app.dobo.config.default.filter
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
    if (count + result.data.length > hardLimit) {
      const sliced = result.data.slice(0, hardLimit - count)
      warnings.push(options.req ? options.req.t('hardLimitWarning%s%s', result.data.length, hardLimit) : this.plugin.t('hardLimitWarning%s%s', result.data.length, hardLimit))
      data.push(...sliced)
      break
    }
    data.push(...result.data)
    count = count + result.data.length
    nFilter.page++
  }
  return dataOnly ? data : { data, count, warnings }
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
