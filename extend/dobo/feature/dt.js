async function dt (opts = {}) {
  opts.field = opts.field ?? 'dt'
  return {
    properties: [{
      name: opts.field ?? 'dt',
      type: 'datetime',
      required: opts.required ?? true,
      index: opts.index ?? true
    }]
  }
}

export default dt
