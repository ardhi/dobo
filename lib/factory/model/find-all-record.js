import { getMultiRefs, execHook, execModelHook, getFilterAndOptions, buildQueryAndMatchFilter } from './_util.js'

async function native (filter, options, dataOnly) {
  const { isSet } = this.app.lib.aneka
  const { get, set } = this.plugin.cache ?? {}
  if (dataOnly) options.count = false
  let { noResultSanitizer, noCache } = options
  if (!this.cacheable) noCache = true
  await buildQueryAndMatchFilter.call(this, filter, options)
  await execHook.call(this, 'beforeFindAllRecord', filter, options)
  await execModelHook.call(this, 'beforeFindAllRecord', filter, options)
  if (get && !noCache && !options.record) {
    const cachedResult = await get({ model: this.name, filter, options })
    if (cachedResult) {
      cachedResult.cached = true
      await execModelHook.call(this, 'afterFindAllRecord', filter, cachedResult, options)
      return dataOnly ? cachedResult.data : cachedResult
    }
  }
  const result = options.record ?? (await this.driver._findAllRecord(this, filter, options))
  if (!noResultSanitizer) {
    for (const idx in result.data) {
      result.data[idx] = await this.sanitizeRecord(result.data[idx], options)
    }
  }
  if (isSet(options.refs)) await getMultiRefs.call(this, { records: result.data, options })
  await execModelHook.call(this, 'afterFindAllRecord', filter, result, options)
  await execHook.call(this, 'afterFindAllRecord', filter, result, options)
  if (set && !noCache) await set({ model: this.name, filter, options, result })
  return dataOnly ? result.data : result
}

async function loop (filter, options, dataOnly) {
  const { cloneDeep } = this.app.lib._
  const { maxLimit, hardLimit } = this.app.dobo.config.default.filter
  const nFilter = cloneDeep(filter)
  const nOptions = cloneDeep(options)
  nOptions.count = false
  nOptions.dataOnly = false
  await buildQueryAndMatchFilter.call(this, nFilter, nOptions)
  nFilter.limit = maxLimit
  nFilter.page = 1
  let count = 0
  const data = []
  for (;;) {
    const result = await this.findRecord(nFilter, nOptions)
    if (result.data.length === 0) break
    if (count + result.data.length > hardLimit) {
      const sliced = result.data.slice(0, hardLimit - count)
      data.push(...sliced)
      break
    }
    data.push(...result.data)
    count = count + result.data.length
    nFilter.page++
  }
  return dataOnly ? data : { data, count }
}

async function findAllRecord (params = {}, opts = {}) {
  const { dataOnly = true } = opts
  const { filter, options } = getFilterAndOptions.call(this, params, opts)
  if (this.driver.findAllRecord) return await native.call(this, filter, options, dataOnly)
  return await loop.call(this, filter, options, dataOnly)
}

export default findAllRecord
