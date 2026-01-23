import { getMultiRefs, execHook, execModelHook, execDynHook, getFilterAndOptions } from './_util.js'
const action = 'findAllRecord'

async function native (filter, options, dataOnly) {
  const { isSet } = this.app.lib.aneka
  const { get, set } = this.plugin.cache ?? {}
  if (dataOnly) options.count = false
  let { noResultSanitizer, noCache } = options
  if (!this.cacheable) noCache = true
  await execHook.call(this, 'beforeFindAllRecord', filter, options)
  await execModelHook.call(this, 'beforeFindAllRecord', filter, options)
  await execDynHook.call(this, 'beforeFindAllRecord', filter, options)
  if (get && !noCache && !options.record) {
    const cachedResult = await get({ model: this.name, filter, options })
    if (cachedResult) {
      cachedResult.cached = true
      await execModelHook.call(this, 'afterFindAllRecord', filter, cachedResult, options)
      return dataOnly ? cachedResult.data : cachedResult
    }
  }
  const result = options.record ?? (await this.driver._findAllRecord(this, filter, options)) ?? {}
  if (!noResultSanitizer) {
    for (const idx in result.data) {
      result.data[idx] = await this.sanitizeRecord(result.data[idx], options)
    }
  }
  if (isSet(options.refs)) await getMultiRefs.call(this, result.data, options)
  await execDynHook.call(this, 'beforeCreateRecord', filter, result, options)
  await execModelHook.call(this, 'afterFindAllRecord', filter, result, options)
  await execHook.call(this, 'afterFindAllRecord', filter, result, options)
  if (set && !noCache) await set({ model: this.name, filter, options, result })
  return dataOnly ? result.data : result
}

async function loop (params, opts, dataOnly) {
  const { cloneDeep } = this.app.lib._
  const { filter, options } = await getFilterAndOptions.call(this, params, opts, action)
  const { maxLimit, hardLimit } = this.app.dobo.config.default.filter
  const nFilter = cloneDeep(filter)
  const nOptions = cloneDeep(options)
  nOptions.count = false
  nOptions.dataOnly = false
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

async function findAllRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const [params = {}, opts = {}] = args
  const { dataOnly = true } = opts
  if (this.driver.findAllRecord) {
    const { filter, options } = await getFilterAndOptions.call(this, params, opts, action)
    return await native.call(this, filter, options, dataOnly)
  }
  return await loop.call(this, params, opts, dataOnly)
}

export default findAllRecord
