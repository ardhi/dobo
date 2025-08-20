async function intId (opts = {}) {
  return {
    properties: [{
      name: 'id',
      type: 'integer',
      required: true,
      index: 'primary',
      unsigned: true
    }]
  }
}

export default intId
