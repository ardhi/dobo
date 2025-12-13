/**
 * Sanitize id according it's schema
 *
 * @method
 * @memberof Dobo
 * @param {(number|string)} id
 * @param {Object} schema
 * @returns {(number|string)}
 */

function sanitizeId (id, schema) {
  const prop = schema.properties.find(p => p.name === 'id')
  if (prop.type === 'integer') id = parseInt(id)
  return id
}

export default sanitizeId
