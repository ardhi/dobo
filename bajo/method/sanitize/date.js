function sanitizeDate (value, { input, output, silent = true } = {}) {
  const { dayjs } = this.app.bajo.lib
  if (value === 0) return null
  if (!output) output = input
  const dt = dayjs(value, input)
  if (!dt.isValid()) {
    if (silent) return -1
    throw this.error('Invalid date')
  }
  if (output === 'native' || !output) return dt.toDate()
  return dt.format(output)
}

export default sanitizeDate
