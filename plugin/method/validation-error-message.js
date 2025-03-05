function validationErrorMessage (err) {
  let text = err.message
  if (err.details) {
    text += ' -> '
    text += this.app.bajo.join(err.details.map((d, idx) => {
      return `${d.field}@${err.model}: ${d.error} (${d.value})`
    }))
  }
  return text
}

export default validationErrorMessage
