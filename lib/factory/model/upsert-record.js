import { getFilterAndOptions, execHook, execModelHook, execDynHook, execValidation, getRefs, handleReq, clearCache } from './helper.js'
const action = 'upsertRecord'

async function native (body = {}, opts = {}) {
  const { isSet } = this.app.lib.aneka
  const { getDefaultValues } = this.app.dobo
  const { cloneDeep, get } = this.app.lib._
  opts.dataOnly = opts.dataOnly ?? true
  const { dataOnly } = opts
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  const { truncateString, noResult, noBodySanitizer, noResultSanitizer, noValidation } = options
  const extFields = get(options, 'validation.extFields', [])
  let input = noBodySanitizer ? cloneDeep(body) : await this.sanitizeBody({ body, extFields, strict: true, truncateString, action })
  if (!noValidation) input = await execValidation.call(this, input, options)
  await execHook.call(this, 'beforeUpsertRecord', input, options)
  await execModelHook.call(this, 'beforeUpsertRecord', input, options)
  await execDynHook.call(this, 'beforeUpsertRecord', input, options)
  const result = options.record ?? (await this.adapter._upsertRecord(this, input, options)) ?? {}
  if (noResult) return
  await handleReq.call(this, result.data.id, 'upserted', options)
  await clearCache.call(this, body.id)
  const { warnings } = getDefaultValues(options)
  if (!warnings) delete result.warnings
  if (isSet(options.refs)) await getRefs.call(this, [result.data], options)
  if (!noResultSanitizer) result.data = await this.sanitizeRecord(result.data, options)
  await execDynHook.call(this, 'afterUpsertRecord', input, result, options)
  await execModelHook.call(this, 'afterUpsertRecord', input, result, options)
  await execHook.call(this, 'afterUpsertRecord', input, result, options)
  return dataOnly ? result.data : result
}

async function manual (body = {}, options = {}) {
  const { isSet } = this.app.lib.aneka
  const { get, omit } = this.app.lib._
  if (isSet(body.id)) body.id = this.sanitizeId(body.id)
  let old = false
  if (isSet(body.id)) {
    try {
      old = await this.adapter._getRecord(this, body.id, { noHook: true, noModelHook: true })
    } catch (err) {
    }
  }
  const id = get(old, 'data.id')
  if (id) return await this.updateRecord(old.data.id, omit(body, ['id']), options)
  return await this.createRecord(body, options)
}

/**
 * Upserts a record in the model's underlying data store. If a record with the specified ID exists, it updates that record; otherwise, it creates a new record.
 *
 * If no arguments are provided, it automatically turns into a chainable {@link DoboAction} object.
 * @async
 * @memberof DoboModel
 * @method
 * @param  {object} body - The data for the record to be upserted.
 * @param  {DoboModel.TOptions} [opts] - Options object.
 * @see {@link DoboModel.THookBeforeUpsertRecord}
 * @see {@link DoboModel.THookAfterUpsertRecord}
 * @returns {DoboAction|DoboModel.TResultCreateRecord|DoboModel.TResultUpdateRecord|DoboModel.TRecord}
 */
async function upsertRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const [body = {}, opts = {}] = args
  if (this.adapter.upsertRecord) {
    const { options } = await getFilterAndOptions.call(this, null, opts, action)
    return await native.call(this, body, options)
  }
  return await manual.call(this, body, opts)
}

export default upsertRecord
