async function getPath (name, id, field, file, options = {}) {
  const { getPluginDataDir } = this.app.bajo
  const { pascalCase } = this.app.lib.aneka
  const { fs } = this.app.lib
  const dir = `${getPluginDataDir(this.ns)}/attachment/${pascalCase(name)}/${id}`
  if (options.dirOnly) return dir
  const path = field ? `${dir}/${field}/${file}` : `${dir}/${file}`
  if (!fs.existsSync(path)) throw this.error('notFound')
  return path
}

export default getPath
