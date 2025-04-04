async function execFeatureHook (name, params = {}) {
  const { get } = this.lib._
  const { schema } = params
  for (const f of schema.feature) {
    const fn = get(this.feature, f.name)
    if (!fn) continue
    const input = await fn.call(this, f)
    const hook = get(input, 'hook.' + name)
    if (hook) await hook.call(this, params)
  }
}

export default execFeatureHook
