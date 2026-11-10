import test from 'node:test'
import assert from 'node:assert/strict'
import { findMatches } from './.build/search.mjs'
import { addRecent, getRecent, MAX_RECENT } from './.build/recent.mjs'
import { getReading } from './.build/reading-config.mjs'

test('findMatches is case-insensitive and reports line numbers', () => {
  const text = 'Title\n\nInstall the Tool first.\nthen run the tool again'
  const hits = findMatches(text, 'TOOL')
  assert.deepEqual(
    hits.map(h => h.line),
    [3, 4],
  )
  assert.equal(findMatches(text, 'tool', 1).length, 1)
  assert.deepEqual(findMatches(text, '   '), [])
})

test('findMatches shortens long lines around the match', () => {
  const line = 'a'.repeat(200) + ' needle ' + 'b'.repeat(200)
  const [hit] = findMatches(line, 'needle')
  assert.ok(hit.text.startsWith('…') && hit.text.endsWith('…'))
  assert.ok(hit.text.length < 150)
})

test('recent files: newest first, no duplicates, capped', () => {
  let list = []
  for (let i = 0; i < MAX_RECENT + 5; i++) {
    list = addRecent(list, `file:///C:/docs/${i}.md`, `Doc ${i}`)
  }
  assert.equal(list.length, MAX_RECENT)
  list = addRecent(list, 'file:///C:/docs/10.md#part', '')
  assert.equal(list[0].url, 'file:///C:/docs/10.md')
  assert.equal(list[0].title, '10.md')
  assert.equal(list.filter(r => r.url.endsWith('/10.md')).length, 1)
})

test('recent files: bad stored data is ignored', () => {
  assert.deepEqual(getRecent(null), [])
  assert.deepEqual(
    getRecent({ recentFiles: [{ url: 'javascript:alert(1)', title: 'x' }, 5] }),
    [],
  )
})

test('reading settings are clamped; invalid means default', () => {
  assert.deepEqual(getReading({ fontSize: 99, width: 10, lineHeight: 'x' }), {
    fontSize: 28,
    width: 480,
    lineHeight: 0,
  })
  assert.deepEqual(getReading(), { fontSize: 0, width: 0, lineHeight: 0 })
})
