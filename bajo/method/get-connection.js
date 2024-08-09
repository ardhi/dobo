function getConnection (name) {
  const { find } = this.app.bajo.lib._
  return find(this.connections, { name })
}

export default getConnection
