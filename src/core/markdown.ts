import hljs from 'highlight.js'
import MarkdownIt, {
  type MarkdownIt as MarkdownItInstance,
  type MarkdownItOptions,
} from 'markdown-it'
import mSub from 'markdown-it-sub'
import mSup from 'markdown-it-sup'
import mIns from 'markdown-it-ins'
import mAbbr from 'markdown-it-abbr'
import mMark from 'markdown-it-mark'
import { full as mEmoji } from 'markdown-it-emoji'
import mDeflist from 'markdown-it-deflist'
import mFootnote from 'markdown-it-footnote'
import mTaskLists from 'markdown-it-task-lists'
import mToc from 'markdown-it-table-of-contents'
import mKatex from '@traptitech/markdown-it-katex'
import mMermaid from '@/plugins/mermaid-block'
import mAlert from '@/plugins/alert'
import mGraphvizBlock from '@/plugins/graphviz-block'
import mMultimdTable from 'markdown-it-multimd-table'
import MD_PLUGINS from '@/config/md-plugins'
import successIcon from '@/images/icon_success.svg'
import copyIcon from '@/images/icon_copy.svg'
import className from '@/config/class-name'
import Ele, { svg } from './ele'
import { isWrittenAsLink } from './links'

/**
 * markdown-it-multimd-table 4.2.3 (latest) calls md.utils.assign, which
 * markdown-it 14 removed.
 */
function mMultimdTableCompat(md: MarkdownItInstance, options?: any) {
  if (typeof (md.utils as any).assign !== 'function') {
    md.utils = { ...md.utils, assign: Object.assign } as typeof md.utils
  }
  return mMultimdTable(md, options)
}

type Plugins = { [p: string]: ((a: MdOptions) => any[]) | any[] }
const PLUGINS: Plugins = {
  Emoji: [mEmoji],
  Sub: [mSub],
  Sup: [mSup],
  Ins: [mIns],
  Abbr: [mAbbr],
  Katex: [mKatex],
  Mermaid: ({ theme }) => [
    mMermaid,
    { theme: theme === 'dark' ? 'dark' : 'default' },
  ],
  Mark: [mMark],
  Deflist: [mDeflist],
  Footnote: [mFootnote],
  TaskLists: [mTaskLists],
  TOC: [mToc],
  Alert: [mAlert],
  MultimdTable: [mMultimdTableCompat],
}

/** Plugins whose options are applied by md-reader itself, not md.use() */
const SPECIAL = ['Frontmatter', 'Linkify']

export interface MdOptions {
  [key: string]: any
  config?: MarkdownItOptions
  plugins?: Array<string>
  /** user-defined options per plugin name, merged over built-in defaults */
  pluginOptions?: { [plugin: string]: Record<string, any> }
}

const escapeHtml = (str: string): string =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const isPlainObject = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

function initRender({
  config = {},
  plugins = [...MD_PLUGINS],
  pluginOptions = {},
}: MdOptions) {
  const copyButton = new Ele<HTMLElement>(
    'button',
    {
      className: [className.MD_BUTTON, className.COPY_BTN],
      title: 'Copy',
    },
    [
      svg(copyIcon, { className: 'icon-copy' }),
      svg(successIcon, { className: 'icon-success' }),
    ],
  )

  const md = new MarkdownIt({
    html: true,
    breaks: false,
    linkify: true,
    xhtmlOut: true,
    typographer: true,
    highlight(str: string, language: string) {
      if (language && hljs.getLanguage(language)) {
        try {
          return `<pre class="hljs-pre md-reader__code-block"><code class="hljs" lang="${language}">${
            hljs.highlight(str, { language, ignoreIllegals: true }).value
          }</code>${copyButton.ele.outerHTML}</pre>`
        } catch (err) {
          console.error(err)
          return 'parse error'
        }
      }
      const code = escapeHtml(str)
      return `<pre class="hljs-pre md-reader__code-block"><code class="hljs ${language}">${code}</code>${copyButton.ele.outerHTML}</pre>`
    },
    ...config,
  })

  // linkify-it options. linkify-it 6 turned fuzzy links off by default: keep
  // linking www.example.com and emails as before.
  const linkifyOpts = isPlainObject(pluginOptions.Linkify)
    ? pluginOptions.Linkify
    : {}
  try {
    md.linkify.set({ fuzzyLink: true, fuzzyEmail: true, ...linkifyOpts })
  } catch (err) {
    console.error('[md-reader] invalid Linkify options:', err)
  }
  // A file name such as "local.mk" or "setup.py" looks like a web address
  // (.mk and .py are country domains). Like GitHub, only link what was
  // written as a link; { "bareDomains": true } brings the old behaviour back.
  if (linkifyOpts.bareDomains !== true) {
    md.core.ruler.after('linkify', 'anyread_bare_domains', state => {
      for (const block of state.tokens) {
        const list = block.children
        if (block.type !== 'inline' || !list) continue
        for (let i = 0; i < list.length - 2; i++) {
          const open = list[i]
          if (open.type !== 'link_open' || open.markup !== 'linkify') continue
          const text = list[i + 1]
          if (isWrittenAsLink(text.content)) continue
          const plain = new state.Token('text', '', 0)
          plain.content = text.content
          plain.level = open.level
          list.splice(i, 3, plain)
        }
      }
    })
  }

  // custom plugins
  plugins.forEach(name => {
    if (SPECIAL.includes(name)) return
    let plugin = PLUGINS[name]
    if (typeof plugin === 'function') {
      plugin = plugin(arguments[0])
    }
    if (!plugin) return
    const [fn, ...args] = plugin
    const userOpts = pluginOptions[name]
    if (isPlainObject(userOpts) && Object.keys(userOpts).length) {
      // merge user options into the first options argument
      const base = isPlainObject(args[0]) ? args[0] : {}
      args[0] = { ...base, ...userOpts }
    }
    try {
      md.use(fn, ...args)
    } catch (err) {
      console.error(`[md-reader] plugin "${name}" failed to load:`, err)
    }
  })

  if (plugins.includes('Mermaid')) {
    // Install after diagram plugins so Graphviz can override Mermaid fences when
    // the block content is actually DOT syntax.
    md.use(mGraphvizBlock)
  }

  return md
}

// frontmatter must start on the very first line of the file
const FRONTMATTER_RE = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/

export function splitFrontmatter(content: string): {
  frontmatter: string | null
  body: string
} {
  const m = content.match(FRONTMATTER_RE)
  return m
    ? { frontmatter: m[1], body: content.slice(m[0].length) }
    : { frontmatter: null, body: content }
}

/**
 * Render simple YAML frontmatter as a key/value table. Indented or list
 * lines stay with the preceding key. No YAML library: values are shown as
 * escaped text, never evaluated.
 */
export function renderFrontmatter(
  yaml: string,
  { collapsed = false, title = 'Metadata' }: Record<string, any> = {},
): string {
  const rows: Array<[string, string]> = []
  for (const line of yaml.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_][\w.-]*)\s*:\s?(.*)$/)
    if (kv) {
      rows.push([kv[1], kv[2]])
    } else if (rows.length && line.trim()) {
      const last = rows[rows.length - 1]
      last[1] += (last[1] ? '\n' : '') + line.replace(/^\s{0,2}/, '')
    }
  }
  const body = rows.length
    ? `<table><tbody>${rows
        .map(
          ([k, v]) =>
            `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`,
        )
        .join('')}</tbody></table>`
    : `<pre>${escapeHtml(yaml)}</pre>`
  return `<details class="${className.FRONTMATTER}"${
    collapsed ? '' : ' open'
  }><summary>${escapeHtml(String(title))}</summary>${body}</details>`
}

interface MdRender {
  (code: string, options: MdOptions): string
  md?: MarkdownItInstance
  options?: MdOptions
}
export const mdRender: MdRender = (code, options): string => {
  if (!mdRender.md || options) {
    mdRender.md = initRender(options || {})
    mdRender.options = options || {}
  }
  const { plugins = [...MD_PLUGINS], pluginOptions = {} } = mdRender.options
  const { frontmatter, body } = splitFrontmatter(code)
  const html = mdRender.md.render(body)
  if (frontmatter !== null && plugins.includes('Frontmatter')) {
    const opts = isPlainObject(pluginOptions.Frontmatter)
      ? pluginOptions.Frontmatter
      : {}
    return renderFrontmatter(frontmatter, opts) + html
  }
  return html
}

export default initRender
