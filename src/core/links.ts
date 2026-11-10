/** Pure helpers for links between Markdown files (no DOM, easy to test). */
import { isMarkdownName } from './file-types'

const stripHash = (url: string) => url.split('#')[0]

/** heading text → anchor name, the same rule the outline uses */
export const anchorOf = (text: string) =>
  encodeURIComponent(text.trim().toLowerCase().replace(/\s+/g, '-'))

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
