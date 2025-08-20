async function dt (opts = {}) {
  opts.fieldName = opts.fieldName ?? 'dt'
  return {
    properties: [{
      name: opts.fieldName ?? 'dt',
      type: 'datetime',
      required: opts.required ?? true,
      index: opts.index ?? true
    }]
  }
}

export default dt
