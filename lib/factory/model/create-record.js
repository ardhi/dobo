import { getFilterAndOptions, execHook, execValidation, execModelHook, execDynHook, getRefs, handleReq } from './_util.js'

export const onlyTypes = ['datetime', 'date', 'time', 'timestamp', 'array', 'object']
const action = 'createRecord'

async function createRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const [body = {}, opts = {}] = args
  const { getDefaultValues } = this.app.dobo
  const { isSet } = this.app.lib.aneka
  const { cloneDeep, get } = this.app.lib._
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  const { truncateString, noResult, noBodySanitizer, noResultSanitizer, noValidation } = options
  const extFields = get(options, 'validation.extFields', [])
  const input = noBodySanitizer ? cloneDeep(body) : await this.sanitizeBody({ body, extFields, strict: true, truncateString, onlyTypes, action })
  await execHook.call(this, 'beforeCreateRecord', input, options)
  await execModelHook.call(this, 'beforeCreateRecord', input, options)
  await execDynHook.call(this, 'beforeCreateRecord', input, options)
  if (!noValidation) await execValidation.call(this, input, options)
  let result = options.record ?? (await this.driver._createRecord(this, input, options)) ?? {}
  if (noResult) return
  await handleReq.call(this, result.data.id, 'created', options)
  result = result ?? {}
  const { warnings } = getDefaultValues(options)
  if (!warnings) delete result.warnings
  if (isSet(options.refs)) await getRefs.call(this, [result.data], options)
  if (!noResultSanitizer) result.data = await this.sanitizeRecord(result.data, options)
  await execDynHook.call(this, 'afterCreateRecord', input, result, options)
  await execModelHook.call(this, 'afterCreateRecord', input, result, options)
  await execHook.call(this, 'afterCreateRecord', input, result, options)
  return dataOnly ? result.data : result
}

export default createRecord
