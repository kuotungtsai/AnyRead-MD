/**
 * VS Code style view for the extra file types (options page → "Extra file
 * types"): Shiki with VS Code's own grammars and Light+ / Dark+ colours.
 *
 * Everything is bundled: the JavaScript regex engine (no wasm) and a fixed
 * set of grammars, so nothing is fetched at runtime. Extensions without a
 * grammar here fall back to the highlight.js code block. C++ (~840 KB with
 * the grammars it embeds) and JS/TS (~375 KB) are left out on purpose: this
 * bundle is parsed on every markdown page too.
 */
import { createHighlighterCoreSync, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import lightPlus from 'shiki/themes/light-plus.mjs'
import darkPlus from 'shiki/themes/dark-plus.mjs'
import c from 'shiki/langs/c.mjs'
import python from 'shiki/langs/python.mjs'
import json from 'shiki/langs/json.mjs'
import yaml from 'shiki/langs/yaml.mjs'
import shellscript from 'shiki/langs/shellscript.mjs'
import make from 'shiki/langs/make.mjs'
import cmake from 'shiki/langs/cmake.mjs'
import ini from 'shiki/langs/ini.mjs'
import powershell from 'shiki/langs/powershell.mjs'
import bat from 'shiki/langs/bat.mjs'
import asm from 'shiki/langs/asm.mjs'

export const CODE_VIEW_CLASS = 'md-reader__code-view'

/** file extension → Shiki language id ('text' = no colouring) */
const EXT_LANG: Record<string, string> = {
  c: 'c',
  h: 'c',
  py: 'python',
  pyw: 'python',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'shellscript',
  bash: 'shellscript',
  zsh: 'shellscript',
  mk: 'make',
  mak: 'make',
  cmake: 'cmake',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',
  ps1: 'powershell',
  psm1: 'powershell',
  bat: 'bat',
  cmd: 'bat',
  s: 'asm',
  asm: 'asm',
  txt: 'text',
  text: 'text',
  log: 'text',
}

let highlighter: HighlighterCore = null

function getHighlighter() {
  highlighter ??= createHighlighterCoreSync({
    themes: [lightPlus, darkPlus],
    langs: [
      c,
      python,
      json,
      yaml,
      shellscript,
      make,
      cmake,
      ini,
      powershell,
      bat,
      asm,
    ],
    engine: createJavaScriptRegexEngine(),
  })
  return highlighter
}

/** Shiki language for a file extension, or null when it has no grammar here */
export const codeViewLanguage = (ext: string): string | null =>
  EXT_LANG[ext] ?? null

/**
 * HTML for the whole file in VS Code colours. Both themes are emitted as CSS
 * variables, so switching light / dark needs no re-render (see index.less).
 */
export function renderCodeView(code: string, lang: string): string {
  const html = getHighlighter().codeToHtml(code.replace(/\n$/, ''), {
    lang,
    themes: { light: 'light-plus', dark: 'dark-plus' },
    defaultColor: false,
  })
  return `<div class="${CODE_VIEW_CLASS}">${html}</div>`
}
