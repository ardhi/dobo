function sanitizeDate (value, { input, output, silent = true } = {}) {
  const { dayjs } = this.lib
  if (value === 0) return null
  if (!output) output = input
  const dt = dayjs(value, input)
  if (!dt.isValid()) {
    if (silent) return -1
    throw this.error('invalidDate')
  }
  if (output === 'native' || !output) return dt.toDate()
  return dt.format(output)
}

export default sanitizeDate
