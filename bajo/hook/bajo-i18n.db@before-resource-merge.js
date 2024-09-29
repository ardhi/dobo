async function beforeResourceMerge (lng, content) {
  const { eachPlugins, readConfig } = this.app.bajo
  const { merge } = this.app.bajo.lib._
  await eachPlugins(async function ({ file, ns }) {
    const item = await readConfig(file, { ns })
    merge(content, item)
  }, { glob: `i18n/${lng}.json`, ns: this.name })
}

export default beforeResourceMerge
