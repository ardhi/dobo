function sanitizeId (id) {
  const prop = this.properties.find(p => p.name === 'id')
  if (prop.type === 'integer') id = parseInt(id)
  return id
}

export default sanitizeId
