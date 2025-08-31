/**
 * Sanitize value as a date/time value. Parse/format string using {@link https://day.js.org/docs/en/display/format|dayjs format}
 *
 * @method
 * @memberof Dobo
 * @param {(number|string)} value - Value to sanitize
 * @param {Object} [options={}] - Options object
 * @param {boolean} [options.silent=true] - If ```true``` (default) and value isn't valid, returns empty
 * @param {string} [options.inputFormat] - If provided, parse value using this option
 * @param {string} [options.outputFormat] - If not provided or ```native```, returns Javascript Date. Otherwise returns formatted date/time string
 * @returns {(string|Date)}
 */

function sanitizeDate (value, { inputFormat, outputFormat, silent = true } = {}) {
  const { dayjs } = this.app.lib
  if (value === 0) return null
  if (!outputFormat) outputFormat = inputFormat
  const dt = dayjs(value, inputFormat)
  if (!dt.isValid()) {
    if (silent) return null
    throw this.error('invalidDate')
  }
  if (outputFormat === 'native' || !outputFormat) return dt.toDate()
  return dt.format(outputFormat)
}

export default sanitizeDate
