/**
 * Unit tests for the modules that need no browser.
 *
 * The sources are TypeScript, so they are first transpiled (types removed,
 * nothing else) into tests/.build/, then run with Node's own test runner:
 *
 *   node tests/run.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(here, '..', 'src', 'core')
const out = path.join(here, '.build')

// modules without DOM or chrome.* use at import time
const MODULES = ['file-types', 'links', 'search', 'recent', 'reading-config']

fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })
for (const name of MODULES) {
  const code = fs.readFileSync(path.join(src, `${name}.ts`), 'utf8')
  const js = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  // Node needs the file extension on relative imports
  const fixed = js.replace(/(from\s+['"])(\.\/[\w-]+)(['"])/g, '$1$2.mjs$3')
  fs.writeFileSync(path.join(out, `${name}.mjs`), fixed)
}

const tests = fs
  .readdirSync(here)
  .filter(f => f.endsWith('.test.mjs'))
  .map(f => path.join(here, f))
const run = spawnSync(
  process.execPath,
  ['--experimental-strip-types', '--test', ...tests],
  {
    stdio: 'inherit',
  },
)
process.exit(run.status ?? 1)
