// Package the built extension as a zip for sharing.
// Output: dist/anyread-md-<version>.zip
//   anyread-md/            <- "Load unpacked" this folder
//     manifest.json, js/, ... (built extension, includes LICENSE and
//     THIRD_PARTY_NOTICES.txt)
//     安裝說明.txt
// Run after building: node scripts/pack-share.mjs
import fs from 'fs'
import archiver from 'archiver'

const root = new URL('../', import.meta.url)
const extDir = new URL('extension/', root)
const guide = new URL('share/安裝說明.txt', root)
const distDir = new URL('dist/', root)

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
const outFile = new URL(`anyread-md-${manifest.version}.zip`, distDir)
const output = fs.createWriteStream(outFile)
const archive = archiver('zip', { zlib: { level: 9 } })

output.on('close', () =>
  console.log(
    `packed ${decodeURIComponent(outFile.pathname.slice(1))} (${(
      archive.pointer() /
      1024 /
      1024
    ).toFixed(2)} MB)`,
  ),
)
archive.on('error', err => {
  console.error(err)
  process.exit(1)
})

archive.pipe(output)
archive.directory(decodeURIComponent(extDir.pathname.slice(1)), 'anyread-md')
archive.file(decodeURIComponent(guide.pathname.slice(1)), {
  name: 'anyread-md/安裝說明.txt',
})
await archive.finalize()
