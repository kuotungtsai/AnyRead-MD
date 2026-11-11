import test from 'node:test'
import assert from 'node:assert/strict'
import {
  anchorOf,
  githubSlug,
  headingIndex,
  isSameFile,
  isWrittenAsLink,
  previewTarget,
} from './.build/links.mjs'

const page = 'file:///C:/docs/guide/index.md'

test('relative Markdown links open in the preview', () => {
  assert.equal(
    previewTarget('other.md', page),
    'file:///C:/docs/guide/other.md',
  )
  assert.equal(
    previewTarget('../api/list.markdown#get', page),
    'file:///C:/docs/api/list.markdown#get',
  )
})

test('other links keep their normal behaviour', () => {
  assert.equal(previewTarget('#section', page), null)
  assert.equal(previewTarget('index.md#section', page), null)
  assert.equal(previewTarget('picture.png', page), null)
  assert.equal(previewTarget('https://example.com/readme.md', page), null)
})

test('a web page only previews files of its own site', () => {
  const web = 'https://example.com/docs/a.md'
  assert.equal(previewTarget('b.md', web), 'https://example.com/docs/b.md')
  assert.equal(previewTarget('https://other.example/b.md', web), null)
  assert.equal(previewTarget('file:///C:/secret.md', web), null)
})

test('isSameFile and anchorOf', () => {
  assert.equal(isSameFile('index.md#a', page), true)
  assert.equal(isSameFile('other.md', page), false)
  assert.equal(anchorOf('  Getting Started  '), 'getting-started')
})

test('GitHub-style heading anchors', () => {
  assert.equal(githubSlug('設定檔與 local.mk'), '設定檔與-localmk')
  assert.equal(githubSlug('Build (x86) & Test'), 'build-x86--test')
  assert.equal(githubSlug('snake_case-name'), 'snake_case-name')
})

test('a #link finds its heading by either naming rule', () => {
  const heads = ['Intro', '設定檔與 local.mk', 'Intro']
  assert.equal(headingIndex(heads, '#設定檔與-localmk'), 1)
  assert.equal(
    headingIndex(heads, '#' + encodeURIComponent('設定檔與-localmk')),
    1,
  )
  assert.equal(headingIndex(heads, '設定檔與-local.mk'), 1)
  assert.equal(headingIndex(heads, 'intro-1'), 2)
  assert.equal(headingIndex(heads, 'missing'), -1)
  assert.equal(headingIndex(heads, ''), -1)
})

test('only links written as links stay links', () => {
  assert.equal(isWrittenAsLink('https://example.com'), true)
  assert.equal(isWrittenAsLink('www.example.com'), true)
  assert.equal(isWrittenAsLink('someone@example.com'), true)
  assert.equal(isWrittenAsLink('local.mk'), false)
  assert.equal(isWrittenAsLink('setup.py'), false)
})
