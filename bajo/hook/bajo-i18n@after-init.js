async function bajoI18NAfterInit () {
  const config = this.app.bajoI18N.config
  if (!config.fallbackNS.includes(this.name)) config.fallbackNS.unshift(this.name)
}

export default bajoI18NAfterInit
