import test from 'node:test'
import assert from 'node:assert/strict'
import {
  matchPatterns,
  originPattern,
  parseExtensions,
  patternsFor,
  urlExtension,
  webBases,
} from './.build/file-types.mjs'

test('parseExtensions keeps plain extensions only', () => {
  const { exts, invalid } = parseExtensions('c, .h *.py  md html a/b')
  assert.deepEqual(exts, ['c', 'h', 'py'])
  assert.deepEqual(invalid, ['html', 'a/b'])
})

test('urlExtension reads the last path segment', () => {
  assert.equal(urlExtension('file:///C:/docs/My%20Note.MD?x=1#top'), 'md')
  assert.equal(urlExtension('https://example.com/folder.v2/readme'), '')
})

test('webBases keeps web sites and collapses to all sites', () => {
  assert.deepEqual(webBases(['file:///*', 'https://example.com/*']), [
    'https://example.com/',
  ])
  assert.deepEqual(webBases(['https://example.com/*', '*://*/*']), ['*://*/'])
  assert.deepEqual(webBases(['<all_urls>']), ['*://*/'])
  assert.deepEqual(webBases([]), [])
})

test('patternsFor covers both cases and query strings', () => {
  assert.deepEqual(patternsFor(['md'], ['https://example.com/']), [
    'https://example.com/*.md',
    'https://example.com/*.md?*',
    'https://example.com/*.MD',
    'https://example.com/*.MD?*',
  ])
  assert.deepEqual(patternsFor(['md'], []), [])
})

test('code file types are local only until a site is allowed', () => {
  const local = matchPatterns(['c'])
  assert.ok(local.every(p => p.startsWith('file:///')))
  const withSite = matchPatterns(['c'], ['https://example.com/'])
  assert.ok(withSite.includes('https://example.com/*.c'))
  assert.ok(withSite.includes('file:///*.c'))
})

test('originPattern asks for one site only', () => {
  assert.equal(
    originPattern('https://example.com:8080/a/b.md?x#y'),
    'https://example.com:8080/*',
  )
  assert.equal(originPattern('file:///C:/a.md'), null)
  assert.equal(originPattern('not a url'), null)
})
