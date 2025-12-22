async function updateAttachment (...args) {
  if (args.length === 0) return this.action('updateAttachment', ...args)
  const [id, opts = {}] = args
  return this.createAttachment(this, id, opts)
}

export default updateAttachment
