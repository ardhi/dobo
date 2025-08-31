const indexTypes = ['default', 'unique', 'primary', 'fulltext']

async function genericPropSanitizer ({ prop, schema, driver }) {
  const { join } = this.app.bajo
  const { has, get, each } = this.app.lib._
  const { propType } = this.app.pluginClass.dobo
  const def = propType[prop.type]
  // detect from drivers
  if (prop.type === 'string') {
    def.minLength = prop.minLength ?? 0
    def.maxLength = prop.maxLength ?? 255
    if (has(prop, 'length')) def.maxLength = prop.length
    if (prop.required && def.minLength === 0) def.minLength = 1
    if (def.minLength > 0) prop.required = true
  }
  if (prop.autoInc && !['smallint', 'integer'].includes(prop.type)) delete prop.autoInc
  each(['minLength', 'maxLength', 'textType'], p => {
    if (!has(def, p)) {
      delete prop[p]
      return undefined
    }
    prop[p] = get(prop, p, get(this.config, `default.property.${prop.type}.${p}`, def[p]))
    if (def.values && !def.values.includes(prop[p])) {
      this.fatal('unsupportedAllowedChoices%s%s%s%s%s', p, prop[p], prop.name, schema.name, join(def.values))
    }
  })
  if (prop.index && !indexTypes.includes(prop.index.type)) {
    this.fatal('unsupportedIndexType%s%s%s%s', prop.index.type, prop.name, schema.name, join(indexTypes))
  }
}

export default genericPropSanitizer
