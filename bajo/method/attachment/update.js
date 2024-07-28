import create from './create.js'

async function update (name, id, options = {}) {
  return create.call(this, name, id, options)
}

export default update
