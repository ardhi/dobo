async function bajoI18nBeforeInit () {
  const config = this.app.bajoI18N.config
  if (!config.fallbackNS.includes(this.name)) config.fallbackNS.push(this.name)
}

export default bajoI18nBeforeInit
