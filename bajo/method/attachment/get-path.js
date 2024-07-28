async function getPath (name, id, field, file, options = {}) {
  const { pascalCase, getPluginDataDir } = this.app.bajo
  const { fs } = this.app.bajo.lib
  const dir = `${getPluginDataDir(this.name)}/attachment/${pascalCase(name)}/${id}`
  if (options.dirOnly) return dir
  const path = field ? `${dir}/${field}/${file}` : `${dir}/${file}`
  if (!fs.existsSync(path)) throw this.error('notfound')
  return path
}

export default getPath
