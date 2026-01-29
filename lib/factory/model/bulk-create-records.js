import { getFilterAndOptions, execHook, execValidation, execModelHook, execDynHook } from './_util.js'

export const onlyTypes = ['datetime', 'date', 'time', 'timestamp']
const action = 'bulkCreateRecords'

async function bulkCreateRecords (...args) {
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
  await execHook.call(this, 'beforeBulkCreateRecords', inputs, options)
  await execModelHook.call(this, 'beforeBulkCreateRecords', inputs, options)
  await execDynHook.call(this, 'beforeBulkCreateRecords', inputs, options)
  if (!noValidation) {
    for (const input of inputs) {
      await execValidation.call(this, input, options)
    }
  }
  // TODO: bulk don't return anything currently, it should return at least a stat
  await this.driver._bulkCreateRecords(this, inputs, options)
  await execDynHook.call(this, 'afterBulkCreateRecords', inputs, options)
  await execModelHook.call(this, 'afterBulkCreateRecords', inputs, options)
  await execHook.call(this, 'afterBulkCreateRecords', inputs, options)
  return []
}

export default bulkCreateRecords
