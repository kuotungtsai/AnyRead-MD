/** Pure helpers for links between Markdown files (no DOM, easy to test). */
import { isMarkdownName } from './file-types'

const stripHash = (url: string) => url.split('#')[0]

/** heading text → anchor name, the same rule the outline uses */
export const anchorOf = (text: string) =>
  encodeURIComponent(text.trim().toLowerCase().replace(/\s+/g, '-'))

/**
 * Heading text → the anchor GitHub and GitLab give it: lower case,
 * punctuation (such as "." or "(") dropped, each space turned into "-".
 * Documents written for those sites link to headings this way.
 */
export const githubSlug = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
    .replace(/ /g, '-')

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/** names[i] made unique the way both sites do it: "a", "a-1", "a-2" ... */
function numbered(names: string[]): string[] {
  const seen: Record<string, number> = Object.create(null)
  return names.map(name => {
    if (!(name in seen)) {
      seen[name] = 0
      return name
    }
    seen[name] += 1
    return `${name}-${seen[name]}`
  })
}

/**
 * Which heading a "#name" link points to (-1 when none). Accepts this
 * reader's own anchors and GitHub-style ones, so `#platform-localmk` finds
 * the heading "Platform local.mk".
 */
export function headingIndex(texts: string[], hash: string): number {
  const wanted = decode(hash.replace(/^#/, ''))
  if (!wanted) return -1
  const own = numbered(texts.map(t => decode(anchorOf(t))))
  let i = own.indexOf(wanted)
  if (i >= 0) return i
  const github = numbered(texts.map(githubSlug))
  i = github.indexOf(wanted.toLowerCase())
  return i
}

/**
 * Whether an automatically found link was written as a link: with a scheme
 * (https://, ftp:// ...), starting with "www." or an e-mail address. A bare
 * name such as "local.mk" or "setup.py" is left as text, like GitHub does.
 */
export const isWrittenAsLink = (text: string) =>
  /^([a-z][a-z0-9+.-]*:|\/\/|www\.)/i.test(text) || text.includes('@')

/** a page may read files of its own kind: local → local, a site → itself */
export function sameSite(target: URL, from: URL): boolean {
  return target.protocol === 'file:'
    ? from.protocol === 'file:'
    : /^https?:$/.test(target.protocol) && target.origin === from.origin
}

/**
 * The Markdown file a link points to, or null when the link should behave
 * normally (another site, not Markdown, or just an anchor in the same file).
 */
export function previewTarget(href: string, base: string): string | null {
  let url: URL
  let from: URL
  try {
    url = new URL(href, base)
    from = new URL(base)
  } catch {
    return null
  }
  if (!isMarkdownName(url.pathname)) return null
  if (!sameSite(url, from)) return null
  if (stripHash(url.href) === stripHash(from.href)) return null
  return url.href
}

/** true when the link only moves inside the file at `base` */
export function isSameFile(href: string, base: string): boolean {
  try {
    return stripHash(new URL(href, base).href) === stripHash(base)
  } catch {
    return false
  }
}
