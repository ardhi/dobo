import { getFilterAndOptions, execHook, execValidation, execModelHook, execDynHook } from './_util.js'

export const onlyTypes = ['datetime', 'date', 'time', 'timestamp']
const action = 'bulkCreateRecord'

async function bulkCreateRecord (...args) {
  if (args.length === 0) return this.action(action, ...args)
  const [bodies = [], opts = {}] = args
  const { cloneDeep, get } = this.app.lib._
  const { options } = await getFilterAndOptions.call(this, null, opts, action)
  const { truncateString, noBodySanitizer, noValidation } = options
  const extFields = get(options, 'validation.extFields', [])

  const inputs = cloneDeep(bodies)
  if (!noBodySanitizer) {
    for (const idx in inputs) {
      inputs[idx] = await this.sanitizeBody({ body: inputs[idx], extFields, strict: true, truncateString, onlyTypes })
    }
  }
  await execHook.call(this, 'beforeBulkCreateRecord', inputs, options)
  await execModelHook.call(this, 'beforeBulkCreateRecord', inputs, options)
  await execDynHook.call(this, 'beforeBulkCreateRecord', inputs, options)
  if (!noValidation) {
    for (const input of inputs) {
      await execValidation.call(this, input, options)
    }
  }
  // TODO: bulk don't return anything currently, it should return at least a stat
  await this.driver._bulkCreateRecords(this, inputs, options)
  await execDynHook.call(this, 'afterBulkCreateRecord', inputs, options)
  await execModelHook.call(this, 'afterBulkCreateRecord', inputs, options)
  await execHook.call(this, 'afterBulkCreateRecord', inputs, options)
  return []
}

export default bulkCreateRecord
