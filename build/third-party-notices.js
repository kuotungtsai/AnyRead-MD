// Emits THIRD_PARTY_NOTICES.txt next to the bundles: the copyright and
// license text of every npm package whose code, CSS or fonts end up in the
// build. MIT / BSD / ISC all require these notices to ship with each copy.
const fs = require('fs')
const path = require('path')
const { Compilation, sources } = require('webpack')

const LICENSE_FILE = /^(licen[cs]e|copying|notice)(\.|-|$)/i

function packageRoot(file, cache) {
  let dir = path.dirname(file)
  const seen = []
  while (dir.includes('node_modules')) {
    if (cache.has(dir)) break
    seen.push(dir)
    const pj = path.join(dir, 'package.json')
    if (fs.existsSync(pj)) {
      const pkg = JSON.parse(fs.readFileSync(pj, 'utf8'))
      // nested package.json files (e.g. {"type":"module"}) have no name
      if (pkg.name && pkg.version) {
        seen.forEach(d => cache.set(d, dir))
        return dir
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  const found = cache.get(dir) || null
  seen.forEach(d => cache.set(d, found))
  return found
}

function resourcesOf(module, out) {
  if (module.modules) module.modules.forEach(m => resourcesOf(m, out))
  if (module.rootModule) resourcesOf(module.rootModule, out)
  if (typeof module.resource === 'string') {
    out.push(module.resource.split('?')[0])
  }
}

function licenseText(dir, pkg) {
  const files = fs
    .readdirSync(dir)
    .filter(f => LICENSE_FILE.test(f))
    .sort()
  if (files.length) {
    return files
      .map(f => fs.readFileSync(path.join(dir, f), 'utf8').trim())
      .join('\n\n')
  }
  const author =
    typeof pkg.author === 'string' ? pkg.author : pkg.author && pkg.author.name
  return `No license file in the package. package.json declares: ${
    pkg.license || 'UNKNOWN'
  }${author ? `\nAuthor: ${author}` : ''}`
}

class ThirdPartyNoticesPlugin {
  // packages: names to always include (e.g. pulled in by a Less @import,
  //   which webpack never sees as a module)
  // supplements: extra notices for code a package bundles without shipping
  //   its license file, e.g. C libraries compiled to WebAssembly
  constructor({
    filename = 'THIRD_PARTY_NOTICES.txt',
    header = '',
    packages = [],
    supplements = [],
  } = {}) {
    this.filename = filename
    this.header = header
    this.packages = packages
    this.supplements = supplements
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap('ThirdPartyNotices', compilation => {
      compilation.hooks.processAssets.tap(
        {
          name: 'ThirdPartyNotices',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        () => {
          const cache = new Map()
          const roots = new Set()
          for (const module of compilation.modules) {
            const files = []
            resourcesOf(module, files)
            for (const file of files) {
              if (!file.includes('node_modules')) continue
              const root = packageRoot(file, cache)
              if (root) roots.add(root)
            }
          }

          for (const name of this.packages) {
            const pj = path.join(
              compiler.context,
              'node_modules',
              name,
              'package.json',
            )
            if (!fs.existsSync(pj)) {
              compilation.errors.push(
                new Error(`ThirdPartyNotices: ${name} not installed`),
              )
              continue
            }
            roots.add(path.dirname(fs.realpathSync(pj)))
          }

          const entries = [...roots]
            .map(dir => {
              const pkg = JSON.parse(
                fs.readFileSync(path.join(dir, 'package.json'), 'utf8'),
              )
              return { dir, pkg }
            })
            .sort((a, b) =>
              `${a.pkg.name}@${a.pkg.version}`.localeCompare(
                `${b.pkg.name}@${b.pkg.version}`,
              ),
            )

          const line = '='.repeat(78)
          const body = entries
            .map(({ dir, pkg }) => {
              const repo =
                typeof pkg.repository === 'string'
                  ? pkg.repository
                  : pkg.repository && pkg.repository.url
              return [
                line,
                `${pkg.name}@${pkg.version}  (${
                  pkg.license || 'see license text'
                })`,
                repo ? `Source: ${repo}` : null,
                line,
                '',
                licenseText(dir, pkg),
                '',
              ]
                .filter(l => l !== null)
                .join('\n')
            })
            .join('\n')

          const extra = this.supplements
            .map(({ title, text }) =>
              [line, title, line, '', text.trim(), ''].join('\n'),
            )
            .join('\n')

          const summary = entries
            .map(
              ({ pkg }) =>
                `  - ${pkg.name}@${pkg.version} (${
                  pkg.license || 'see license text'
                })`,
            )
            .concat(this.supplements.map(s => `  - ${s.title}`))
            .join('\n')

          const count = entries.length + this.supplements.length
          const text = `${this.header}\nThis build includes the following ${count} third-party components:\n\n${summary}\n\n${body}\n${extra}`
          compilation.emitAsset(this.filename, new sources.RawSource(text))
        },
      )
    })
  }
}

module.exports = ThirdPartyNoticesPlugin
