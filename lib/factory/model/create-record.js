import { getFilterAndOptions, execHook, execValidation, execModelHook, getSingleRef, handleReq } from './_util.js'

async function createRecord (...args) {
  if (args.length === 0) return this.action('createRecord', ...args)
  const [body = {}, opts = {}] = args
  const { isSet } = this.app.lib.aneka
  const { runHook } = this.app.bajo
  const { cloneDeep, get } = this.app.lib._
  const { dataOnly = true } = opts
  const { options } = getFilterAndOptions.call(this, opts)
  const { truncateString, noResult, noBodySanitizer, noResultSanitizer, noValidation } = options
  const extFields = get(options, 'validation.extFields', [])
  let input = noBodySanitizer ? cloneDeep(body) : await this.sanitizeBody({ body, extFields, strict: true, truncateString })
  if (!noValidation) input = await execValidation.call(this, input, options)
  await execHook.call(this, 'beforeCreateRecord', input, options)
  await execModelHook.call(this, 'beforeCreateRecord', input, options)
  const result = options.record ?? (await this.driver._createRecord(this, input, options))
  if (noResult) {
    await runHook('cache:clear', this, 'create', body)
    return
  }
  if (!noResultSanitizer) result.data = await this.sanitizeRecord(result.data, options)
  if (isSet(options.refs)) await getSingleRef.call(this, { record: result.data, options })
  await handleReq.call(this, result.data.id, 'created', options)
  await execModelHook.call(this, 'afterCreateRecord', input, result, options)
  await execHook.call(this, 'afterCreateRecord', input, result, options)
  await runHook('cache:clear', this, 'create', body, result)
  return dataOnly ? result.data : result
}

export default createRecord
