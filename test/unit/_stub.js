import path from 'node:path'

export const isPlainObject = (v) => Object.prototype.toString.call(v) === '[object Object]'

export const camelCase = (s = '') => {
  return String(s)
    .replace(/^[\s_-]+|[\s_-]+$/g, '')
    .split(/[\s_.-]+/)
    .map((p, i) => i === 0 ? (p[0] ? p[0].toLowerCase() + p.slice(1) : '') : (p[0] ? p[0].toUpperCase() + p.slice(1) : ''))
    .join('')
}

export const pascalCase = (s = '') => {
  const cc = camelCase(s)
  return cc[0] ? cc[0].toUpperCase() + cc.slice(1) : cc
}

export const find = (arr = [], matcher = {}) => {
  if (typeof matcher === 'function') return arr.find(matcher)
  return arr.find(item => Object.keys(matcher).every(k => item?.[k] === matcher[k]))
}
export const filter = (arr = [], matcher = {}) => {
  if (typeof matcher === 'function') return arr.filter(matcher)
  return arr.filter(item => Object.keys(matcher).every(k => item?.[k] === matcher[k]))
}
export const map = (arr = [], fn) => {
  if (typeof fn === 'function') return arr.map(fn)
  if (typeof fn === 'string') return arr.map(item => item?.[fn])
  return [...arr]
}
export const pick = (obj = {}, keys = []) => keys.reduce((a, k) => { if (Object.prototype.hasOwnProperty.call(obj, k)) a[k] = obj[k]; return a }, {})
export const groupBy = (arr = [], key) => arr.reduce((a, item) => { const k = item?.[key]; a[k] = a[k] ?? []; a[k].push(item); return a }, {})
export const isEmpty = (v) => {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  if (isPlainObject(v)) return Object.keys(v).length === 0
  return false
}
export const uniq = (arr = []) => [...new Set(arr)]
export const without = (arr = [], ...vals) => {
  const flat = vals.flat()
  return arr.filter(item => !flat.includes(item))
}
export const trim = (s = '') => String(s).trim()
export const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj ?? {}, k)
export const keys = (obj = {}) => Object.keys(obj)
export const defaults = (obj = {}, src = {}) => {
  for (const k of Object.keys(src)) if (obj[k] === undefined) obj[k] = src[k]
  return obj
}
export const isFunction = (v) => typeof v === 'function'
export const kebabCase = (s = '') => String(s).replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_.]+/g, '-').toLowerCase()
export const chunk = (arr = [], size = 1) => {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
export const last = (arr = []) => arr[arr.length - 1]
export const forOwn = (obj = {}, fn) => {
  for (const k of Object.keys(obj)) fn(obj[k], k)
}
export const findIndex = (arr = [], matcher = {}) => {
  if (typeof matcher === 'function') return arr.findIndex(matcher)
  return arr.findIndex(item => Object.keys(matcher).every(k => item?.[k] === matcher[k]))
}
export const omit = (obj = {}, drop = []) => {
  const d = Array.isArray(drop) ? drop : [drop]
  const out = {}
  for (const k in obj) if (!d.includes(k)) out[k] = obj[k]
  return out
}
export const cloneDeep = (obj) => JSON.parse(JSON.stringify(obj))
export const pullAt = (arr = [], indexes = []) => {
  const idxs = [...indexes].sort((a, b) => b - a)
  for (const idx of idxs) if (Number.isInteger(idx) && idx >= 0 && idx < arr.length) arr.splice(idx, 1)
  return arr
}
export const orderBy = (arr = [], fields = []) => {
  const [field] = fields
  return [...arr].sort((a, b) => {
    if (a[field] === b[field]) return 0
    return a[field] > b[field] ? 1 : -1
  })
}

export const defaultsDeep = (...items) => {
  const out = {}
  const apply = (target, src) => {
    if (!isPlainObject(src)) return target
    for (const k of Object.keys(src)) {
      const tv = target[k]
      const sv = src[k]
      if (isPlainObject(sv)) {
        target[k] = apply(isPlainObject(tv) ? tv : {}, sv)
      } else if (target[k] === undefined) {
        target[k] = sv
      }
    }
    return target
  }
  for (let i = 0; i < items.length; i++) apply(out, items[i])
  return out
}

export const get = (obj, p, fallback) => {
  const parts = String(p).split('.')
  let cur = obj
  for (const part of parts) {
    if (cur == null) return fallback
    cur = cur[part]
  }
  return cur === undefined ? fallback : cur
}

let gid = 0
export const generateId = () => `id-${++gid}`
export const isSet = (v) => v !== undefined && v !== null

export class Base {
  constructor (pkgName, app) {
    this.pkgName = pkgName
    this.app = app
    this.ns = camelCase(pkgName)
    this.alias = this.ns
    this.log = {
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    }
  }

  t = (text) => text

  error = (msg, ...args) => new Error(`${msg}:${args.join(',')}`)

  getConfig = (pathLike) => get(this.config, pathLike)
}

export class Tools {
  constructor (plugin) {
    this.plugin = plugin
    this.app = plugin.app
  }

  async dispose () {
    this.plugin = null
    this.app = null
  }

  bindThis (...fns) {
    for (const fn of fns) {
      if (!fn?.name) continue
      this[fn.name] = fn.bind(this)
    }
  }
}

export const createAppStub = (root = '/tmp/dobo-test') => {
  const app = {
    dir: root,
    t: (text) => text,
    lib: {
      _: {
        find,
        filter,
        isString: (v) => typeof v === 'string',
        isArray: Array.isArray,
        isFunction,
        map,
        get,
        pick,
        groupBy,
        isEmpty,
        isNaN: Number.isNaN,
        trim,
        isPlainObject,
        uniq,
        without,
        defaults,
        findIndex,
        chunk,
        last,
        forOwn,
        kebabCase,
        keys,
        has,
        camelCase,
        isNumber: (v) => typeof v === 'number' && !Number.isNaN(v),
        omit,
        cloneDeep,
        pullAt,
        orderBy
      },
      aneka: {
        pascalCase,
        camelCase,
        defaultsDeep,
        generateId,
        isSet
      },
      dayjs: (value) => {
        const d = value instanceof Date ? value : new Date(value)
        return {
          isValid: () => !Number.isNaN(d.getTime()),
          toDate: () => new Date(d.getTime()),
          format: (pattern) => {
            const y = d.getUTCFullYear()
            const m = String(d.getUTCMonth() + 1).padStart(2, '0')
            const day = String(d.getUTCDate()).padStart(2, '0')
            if (pattern === 'YYYY-MM-DD') return `${y}-${m}-${day}`
            if (pattern === 'YYYY-MM') return `${y}-${m}`
            if (pattern === 'YYYY') return `${y}`
            return d.toISOString()
          }
        }
      },
      fs: {
        ensureDirSync: () => {}
      }
    },
    baseClass: {
      Base,
      Tools
    },
    bajo: {
      breakNsPath: (v) => {
        const i = v.indexOf(':')
        return i === -1 ? { ns: v, path: '' } : { ns: v.slice(0, i), path: v.slice(i + 1) }
      },
      join: (arr = []) => arr.join(', '),
      runHook: async () => {},
      eachPlugins: async () => {},
      buildCollections: async () => [],
      importModule: async () => {},
      callHandler: async (scope, handler, ...args) => typeof handler === 'function' ? handler.call(scope, ...args) : undefined,
      readConfig: async () => ({})
    },
    getPluginDataDir: (name) => path.join(root, 'plugins', name)
  }
  return app
}
