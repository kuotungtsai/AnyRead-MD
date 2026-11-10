// Package the built extension for upload to the Chrome Web Store.
// Output: dist/anyread-md-<version>-store.zip with manifest.json at the
// zip root (the store rejects a zip whose manifest is inside a folder).
// Run after building: node scripts/pack-store.mjs
import fs from 'fs'
import { fileURLToPath } from 'url'
import archiver from 'archiver'

const root = new URL('../', import.meta.url)
const extDir = new URL('extension/', root)
const distDir = new URL('dist/', root)
// works on Windows ("/D:/..." URLs) and on Linux / macOS
const path = u => fileURLToPath(u)

const manifest = JSON.parse(
  fs.readFileSync(new URL('manifest.json', extDir), 'utf8'),
)
for (const required of [
  'manifest.json',
  'LICENSE',
  'THIRD_PARTY_NOTICES.txt',
  'js/content.js',
]) {
  if (!fs.existsSync(new URL(required, extDir))) {
    console.error(`Missing extension/${required}. Build first.`)
    process.exit(1)
  }
}

fs.mkdirSync(distDir, { recursive: true })
const outFile = new URL(`anyread-md-${manifest.version}-store.zip`, distDir)
const output = fs.createWriteStream(outFile)
const archive = archiver('zip', { zlib: { level: 9 } })
// an empty zip means the files were not found: fail loudly
const MIN_BYTES = 500 * 1024
output.on('close', () => {
  console.log(
    `packed ${path(outFile)} (${(archive.pointer() / 1024 / 1024).toFixed(
      2,
    )} MB)`,
  )
  if (archive.pointer() < MIN_BYTES) {
    console.error('The zip is too small: the extension files were not found.')
    process.exit(1)
  }
})
archive.on('error', err => {
  console.error(err)
  process.exit(1)
})
archive.pipe(output)
// no source maps or OS junk in the upload
archive.glob('**/*', {
  cwd: path(extDir),
  ignore: ['**/*.map', '**/.DS_Store', '**/Thumbs.db'],
})
await archive.finalize()
