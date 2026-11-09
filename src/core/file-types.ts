/**
 * Extra file types the user asked md-reader to open as a highlighted code
 * view (options page → "Extra file types"). Markdown types stay hard-coded in
 * the manifest; these are registered at runtime by the background worker.
 */

export const MD_EXTS = ['md', 'mdx', 'mkd', 'markdown']

/** a plain extension: letters/digits, optionally with _ + - (e.g. c, h, cpp, c++, tsx) */
const EXT_RE = /^[a-z0-9][a-z0-9_+-]{0,15}$/
/** keep the registered match list small */
export const MAX_CODE_EXTS = 50
/** types Chrome shows as a web page / image / document, never a text <pre> */
const BLOCKED = new Set(
  'html htm xhtml shtml php asp aspx jsp svg xml pdf png jpg jpeg gif webp ico bmp avif mp3 mp4 webm wav ogg zip gz exe'.split(
    ' ',
  ),
)

/** extension → highlight.js language when the extension is not itself a hljs name/alias */
const LANG_ALIASES: Record<string, string> = {
  h: 'c',
  hpp: 'cpp',
  hh: 'cpp',
  hxx: 'cpp',
  cxx: 'cpp',
  'c++': 'cpp',
  'h++': 'cpp',
  inl: 'cpp',
  txt: 'plaintext',
  text: 'plaintext',
  log: 'plaintext',
  cfg: 'ini',
  conf: 'ini',
  mjs: 'javascript',
  cjs: 'javascript',
  mts: 'typescript',
  cts: 'typescript',
  pyw: 'python',
  bat: 'dos',
  cmd: 'dos',
  ps1: 'powershell',
  psm1: 'powershell',
  s: 'x86asm',
  asm: 'x86asm',
}

export interface ParsedExts {
  exts: string[]
  /** entries that were dropped, as typed */
  invalid: string[]
}

/**
 * Parse "c, h, .cpp *.py txt" into ['c', 'h', 'cpp', 'py', 'txt'].
 * Wildcards and anything that is not a plain extension are rejected, so the
 * result can never match every URL. Markdown types are dropped (always on).
 */
export function parseExtensions(input: string | string[] = ''): ParsedExts {
  const parts = (Array.isArray(input) ? input : String(input).split(/[\s,;]+/))
    .map(s => String(s).trim())
    .filter(Boolean)
  const exts: string[] = []
  const invalid: string[] = []
  for (const raw of parts) {
    const ext = raw.replace(/^\*?\./, '').toLowerCase()
    if (!EXT_RE.test(ext) || BLOCKED.has(ext) || exts.length >= MAX_CODE_EXTS) {
      invalid.push(raw)
    } else if (!MD_EXTS.includes(ext) && !exts.includes(ext)) {
      exts.push(ext)
    }
  }
  return { exts, invalid }
}

/** only trust what the validator accepts, whatever is in storage */
export const sanitizeExts = (saved: unknown): string[] =>
  Array.isArray(saved) ? parseExtensions(saved as string[]).exts : []

/** decoded last path segment of a URL (or a plain file name) */
export function fileName(url: string): string {
  let path = url.split('#')[0].split('?')[0]
  try {
    path = decodeURIComponent(path)
  } catch {
    // keep the encoded path
  }
  return path.slice(path.lastIndexOf('/') + 1)
}

/** lower-cased extension of a URL's last path segment ('' when none) */
export function urlExtension(url: string): string {
  const name = fileName(url)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export const isMarkdownName = (name: string) =>
  MD_EXTS.includes(urlExtension(name))

/** matcher for file names md-reader opens: markdown + the user's code types */
export function viewableMatcher(codeExts: string[] = []) {
  const all = [...MD_EXTS, ...sanitizeExts(codeExts)]
  return (name: string) => all.includes(urlExtension(name))
}

/** highlight.js language for a code extension (hljs aliases resolve the rest) */
export const codeLanguage = (ext: string): string => LANG_ALIASES[ext] || ext

/** wrap raw text as one fenced block, with a fence longer than any ` run inside */
export function toCodeFence(code: string, language: string): string {
  const longest = Math.max(0, ...(code.match(/`+/g) || []).map(s => s.length))
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return `${fence}${language}\n${code.replace(/\n$/, '')}\n${fence}\n`
}

/** content_scripts match patterns for the extensions (both cases, with/without ?query) */
export function matchPatterns(exts: string[]): string[] {
  const patterns: string[] = []
  for (const ext of sanitizeExts(exts)) {
    for (const e of new Set([ext, ext.toUpperCase()])) {
      for (const scheme of ['*://*/', 'file:///']) {
        patterns.push(`${scheme}*.${e}`, `${scheme}*.${e}?*`)
      }
    }
  }
  return patterns
}
