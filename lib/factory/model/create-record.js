import { getFilterAndOptions, execHook, execValidation, execModelHook, getSingleRef, handleReq } from './_util.js'

export const onlyTypes = ['datetime', 'date', 'time', 'timestamp']
const action = 'createRecord'

async function createRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const [body = {}, opts = {}] = args
  const { isSet } = this.app.lib.aneka
  const { runHook } = this.app.bajo
  const { cloneDeep, get } = this.app.lib._
  const { dataOnly = true } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  const { truncateString, noResult, noBodySanitizer, noResultSanitizer, noValidation } = options
  const extFields = get(options, 'validation.extFields', [])
  const input = noBodySanitizer ? cloneDeep(body) : await this.sanitizeBody({ body, extFields, strict: true, truncateString, onlyTypes })
  await execHook.call(this, 'beforeCreateRecord', input, options)
  await execModelHook.call(this, 'beforeCreateRecord', input, options)
  if (!noValidation) await execValidation.call(this, input, options)
  let result = options.record ?? (await this.driver._createRecord(this, input, options)) ?? {}
  if (noResult) {
    await runHook('cache:clear', this, 'create', body)
    return
  }
  result = result ?? {}
  if (!noResultSanitizer) result.data = await this.sanitizeRecord(result.data, options)
  if (isSet(options.refs)) await getSingleRef.call(this, result.data, options)
  await handleReq.call(this, result.data.id, 'created', options)
  await execModelHook.call(this, 'afterCreateRecord', input, result, options)
  await execHook.call(this, 'afterCreateRecord', input, result, options)
  await runHook('cache:clear', this, 'create', body, result)
  return dataOnly ? result.data : result
}

export default createRecord
