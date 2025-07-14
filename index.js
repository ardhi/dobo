import collectConnections from './lib/collect-connections.js'
import collectDrivers from './lib/collect-drivers.js'
import collectFeature from './lib/collect-feature.js'
import collectSchemas from './lib/collect-schemas.js'
import memDbStart from './lib/mem-db/start.js'
import memDbInstantiate from './lib/mem-db/instantiate.js'
import nql from '@tryghost/nql'
import path from 'path'

async function factory (pkgName) {
  const me = this

  return class Dobo extends this.lib.BajoPlugin {
    constructor () {
      super(pkgName, me.app)
      this.alias = 'db'
      this.config = {
        connections: [],
        mergeProps: ['connections'],
        validationParams: {
          abortEarly: false,
          convert: false,
          allowUnknown: true
        },
        default: {
          property: {
            text: {
              kind: 'text'
            },
            string: {
              length: 50
            }
          },
          filter: {
            limit: 25,
            maxLimit: 200,
            sort: ['dt:-1', 'updatedAt:-1', 'updated_at:-1', 'createdAt:-1', 'createdAt:-1', 'ts:-1', 'username', 'name']
          },
          idField: {
            type: 'string',
            maxLength: 50,
            required: true,
            index: { type: 'primary' }
          }
        },
        memDb: {
          createDefConnAtStart: true,
          persistence: {
            syncPeriod: 1
          }
        }
      }
      this.aggregateTypes = ['count', 'avg', 'min', 'max', 'sum']
      this.propType = {
        integer: {
          validator: 'number'
        },
        smallint: {
          validator: 'number'
        },
        text: {
          validator: 'string',
          kind: 'text',
          choices: ['text', 'mediumtext', 'longtext']
        },
        string: {
          validator: 'string',
          maxLength: 255,
          minLength: 0
        },
        float: {
          validator: 'number'
        },
        double: {
          validator: 'number'
        },
        boolean: {
          validator: 'boolean'
        },
        date: {
          validator: 'date'
        },
        datetime: {
          validator: 'date'
        },
        time: {
          validator: 'date'
        },
        timestamp: {
          validator: 'timestamp'
        },
        object: {},
        array: {}
      }
    }

    init = async () => {
      const { buildCollections } = this.app.bajo
      const { fs } = this.lib
      const checkType = async (item, items) => {
        const { filter } = this.lib._
        const existing = filter(items, { type: 'dobo:memory' })
        if (existing.length > 1) this.fatal('onlyOneConnType%s', item.type)
      }

      fs.ensureDirSync(`${this.dir.data}/attachment`)
      await collectDrivers.call(this)
      if (this.config.memDb.createDefConnAtStart) {
        this.config.connections.push({
          type: 'dobo:memory',
          name: 'memory'
        })
      }
      this.connections = await buildCollections({ ns: this.name, container: 'connections', handler: collectConnections, dupChecks: ['name', checkType] })
      if (this.connections.length === 0) this.log.warn('notFound%s', this.print.write('connection'))
      await collectFeature.call(this)
      await collectSchemas.call(this)
    }

    start = async (conns = 'all', noRebuild = true) => {
      const { importModule, breakNsPath } = this.app.bajo
      const { find, filter, isString, map } = this.lib._
      if (conns === 'all') conns = this.connections
      else if (isString(conns)) conns = filter(this.connections, { name: conns })
      else conns = map(conns, c => find(this.connections, { name: c }))
      for (const c of conns) {
        const { ns } = breakNsPath(c.type)
        const schemas = filter(this.schemas, { connection: c.name })
        const mod = c.type === 'dobo:memory' ? memDbInstantiate : await importModule(`${ns}:/${this.name}/boot/instantiate.js`)
        await mod.call(this.app[ns], { connection: c, noRebuild, schemas })
        this.log.trace('driverInstantiated%s%s', c.driver, c.name)
      }
      await memDbStart.call(this)
    }

    pickRecord = async ({ record, fields, schema = {}, hidden = [], forceNoHidden } = {}) => {
      const { isArray, pick, clone, isEmpty, omit } = this.lib._
      const { dayjs } = this.lib

      const transform = async ({ record, schema, hidden = [], forceNoHidden } = {}) => {
        if (record._id) {
          record.id = record._id
          delete record._id
        }
        const defHidden = [...schema.hidden, ...hidden]
        let result = {}
        for (const p of schema.properties) {
          if (!forceNoHidden && defHidden.includes(p.name)) continue
          result[p.name] = record[p.name] ?? null
          if (record[p.name] === null) continue
          switch (p.type) {
            case 'boolean': result[p.name] = !!result[p.name]; break
            case 'time': result[p.name] = dayjs(record[p.name]).format('HH:mm:ss'); break
            case 'date': result[p.name] = dayjs(record[p.name]).format('YYYY-MM-DD'); break
            case 'datetime': result[p.name] = dayjs(record[p.name]).toISOString(); break
          }
        }
        result = await this.sanitizeBody({ body: result, schema, partial: true, ignoreNull: true })
        if (record._rel) result._rel = record._rel
        return result
      }

      if (isEmpty(record)) return record
      if (hidden.length > 0) record = omit(record, hidden)
      if (!isArray(fields)) return await transform.call(this, { record, schema, hidden, forceNoHidden })
      const fl = clone(fields)
      if (!fl.includes('id')) fl.unshift('id')
      if (record._rel) fl.push('_rel')
      return pick(await transform.call(this, { record, schema, hidden, forceNoHidden }), fl)
    }

    prepPagination = async (filter = {}, schema, options = {}) => {
      const buildPageSkipLimit = (filter) => {
        let limit = parseInt(filter.limit) || this.config.default.filter.limit
        if (limit === -1) limit = this.config.default.filter.maxLimit
        if (limit > this.config.default.filter.maxLimit) limit = this.config.default.filter.maxLimit
        if (limit < 1) limit = 1
        let page = parseInt(filter.page) || 1
        if (page < 1) page = 1
        let skip = (page - 1) * limit
        if (filter.skip) {
          skip = parseInt(filter.skip) || skip
          page = undefined
        }
        if (skip < 0) skip = 0
        return { page, skip, limit }
      }

      const buildSort = (input, schema, allowSortUnindexed) => {
        const { isEmpty, map, each, isPlainObject, isString, trim, keys } = this.lib._
        let sort
        if (schema && isEmpty(input)) {
          const columns = map(schema.properties, 'name')
          each(this.config.default.filter.sort, s => {
            const [col] = s.split(':')
            if (columns.includes(col)) {
              input = s
              return false
            }
          })
        }
        if (!isEmpty(input)) {
          if (isPlainObject(input)) sort = input
          else if (isString(input)) {
            const item = {}
            each(input.split('+'), text => {
              let [col, dir] = map(trim(text).split(':'), i => trim(i))
              dir = (dir ?? '').toUpperCase()
              dir = dir === 'DESC' ? -1 : parseInt(dir) || 1
              item[col] = dir / Math.abs(dir)
            })
            sort = item
          }
          if (schema) {
            const items = keys(sort)
            each(items, i => {
              if (!schema.sortables.includes(i) && !allowSortUnindexed) throw this.error('sortOnUnindexedField%s%s', i, schema.name)
              // if (schema.fullText.fields.includes(i)) throw this.error('Can\'t sort on full-text index: \'%s@%s\'', i, schema.name)
            })
          }
        }
        return sort
      }

      const { page, skip, limit } = buildPageSkipLimit.call(this, filter)
      let sortInput = filter.sort
      try {
        sortInput = JSON.parse(sortInput)
      } catch (err) {}
      const sort = buildSort.call(this, sortInput, schema, options.allowSortUnindexed)
      return { limit, page, skip, sort }
    }

    buildMatch = ({ input = '', schema, options }) => {
      const { isPlainObject, trim } = this.lib._
      const split = (value, schema) => {
        let [field, val] = value.split(':').map(i => i.trim())
        if (!val) {
          val = field
          field = '*'
        }
        return { field, value: val }
      }

      input = trim(input)
      let items = {}
      if (isPlainObject(input)) items = input
      else if (input[0] === '{') items = JSON.parse(input)
      else {
        for (const item of input.split('+').map(i => i.trim())) {
          const part = split(item, schema)
          if (!items[part.field]) items[part.field] = []
          items[part.field].push(...part.value.split(' ').filter(v => ![''].includes(v)))
        }
      }
      const matcher = {}
      for (const f of schema.fullText.fields) {
        const value = []
        if (typeof items[f] === 'string') items[f] = [items[f]]
        if (Object.prototype.hasOwnProperty.call(items, f)) value.push(...items[f])
        matcher[f] = value
      }
      if (Object.prototype.hasOwnProperty.call(items, '*')) matcher['*'] = items['*']
      return matcher
    }

    buildQuery = async ({ filter, schema, options = {} } = {}) => {
      const { trim, isString, isPlainObject } = this.lib._
      let query = {}
      if (isString(filter.query)) {
        try {
          filter.oquery = filter.query
          if (trim(filter.query).startsWith('{')) query = JSON.parse(filter.query)
          else query = nql(filter.query).parse()
        } catch (err) {
          this.error('invalidQuery', { orgMessage: err.message })
        }
      } else if (isPlainObject(filter.query)) query = filter.query
      return this.sanitizeQuery(query, schema)
    }

    sanitizeQuery = (query, schema, parent) => {
      const { cloneDeep, isPlainObject, isArray, find } = this.lib._
      const { isSet } = this.lib.aneka
      const { dayjs } = this.lib
      const obj = cloneDeep(query)
      const keys = Object.keys(obj)
      const sanitize = (key, val, p) => {
        if (!isSet(val)) return val
        const prop = find(schema.properties, { name: key.startsWith('$') ? p : key })
        if (!prop) return val
        if (['datetime', 'date', 'time'].includes(prop.type)) {
          const dt = dayjs(val)
          return dt.isValid() ? dt.toDate() : val
        } else if (['smallint', 'integer'].includes(prop.type)) return parseInt(val) || val
        else if (['float', 'double'].includes(prop.type)) return parseFloat(val) || val
        else if (['boolean'].includes(prop.type)) return !!val
        return val
      }
      keys.forEach(k => {
        const v = obj[k]
        if (isPlainObject(v)) obj[k] = this.sanitizeQuery(v, schema, k)
        else if (isArray(v)) {
          v.forEach((i, idx) => {
            if (isPlainObject(i)) obj[k][idx] = this.sanitizeQuery(i, schema, k)
          })
        } else obj[k] = sanitize(k, v, parent)
      })
      return obj
    }

    validationErrorMessage = (err) => {
      let text = err.message
      if (err.details) {
        text += ' -> '
        text += this.app.bajo.join(err.details.map((d, idx) => {
          return `${d.field}@${err.model}: ${d.error} (${d.value})`
        }))
      }
      return text
    }

    getConnection = (name) => {
      const { find } = this.lib._
      return find(this.connections, { name })
    }

    getInfo = (name) => {
      const { breakNsPath } = this.app.bajo
      const { find, map, isEmpty } = this.lib._
      const schema = this.getSchema(name)
      const conn = this.getConnection(schema.connection)
      let { ns, path: type } = breakNsPath(conn.type)
      if (isEmpty(type)) type = conn.type
      const driver = find(this.drivers, { type, ns, driver: conn.driver })
      const instance = find(this.app[driver.ns].instances, { name: schema.connection })
      const opts = conn.type === 'mssql' ? { includeTriggerModifications: true } : undefined
      const returning = [map(schema.properties, 'name'), opts]
      return { instance, driver, connection: conn, returning, schema }
    }

    getSchema = (input, cloned = true) => {
      const { find, isPlainObject, cloneDeep } = this.lib._
      const { pascalCase } = this.lib.aneka
      let name = isPlainObject(input) ? input.name : input
      name = pascalCase(name)
      const schema = find(this.schemas, { name })
      if (!schema) throw this.error('unknownModelSchema%s', name)
      return cloned ? cloneDeep(schema) : schema
    }

    getField = (name, model) => {
      const { getInfo } = this.app.dobo
      const { find } = this.lib._
      const { schema } = getInfo(model)

      return find(schema.properties, { name })
    }

    hasField = (name, model) => {
      return !!this.getField(name, model)
    }

    getMemdbStorage = (name, fields = []) => {
      const { map, pick } = this.lib._
      const all = this.memDb.storage[name] ?? []
      if (fields.length === 0) return all
      return map(all, item => pick(item, fields))
    }

    listAttachments = async ({ model, id = '*', field = '*', file = '*' } = {}, { uriEncoded = true } = {}) => {
      const { map, kebabCase } = this.lib._
      const { pascalCase } = this.lib.aneka
      const { importPkg, getPluginDataDir } = this.app.bajo
      const mime = await importPkg('waibu:mime')
      const { fastGlob } = this.lib
      const root = `${getPluginDataDir('dobo')}/attachment`
      model = pascalCase(model)
      let pattern = `${root}/${model}/${id}/${field}/${file}`
      if (uriEncoded) pattern = pattern.split('/').map(p => decodeURI(p)).join('/')
      return map(await fastGlob(pattern), f => {
        const mimeType = mime.getType(path.extname(f)) ?? ''
        const fullPath = f.replace(root, '')
        const row = {
          file: f,
          fileName: path.basename(fullPath),
          fullPath,
          mimeType,
          params: { model, id, field, file }
        }
        if (this.app.waibuMpa) {
          const { routePath } = this.app.waibu
          const [, _model, _id, _field, _file] = fullPath.split('/')
          row.url = routePath(`dobo:/attachment/${kebabCase(_model)}/${_id}/${_field}/${_file}`)
        }
        return row
      })
    }
  }
}

export default factory
