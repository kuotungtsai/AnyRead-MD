import type { MarkdownIt } from 'markdown-it'
import { renderMermaidPlaceholder, setMermaidConfig } from '@/core/mermaid'

export interface MermaidOptions {
  [key: string]: any
  /** `token`: fence info string (default "mermaid"); other keys rename diagram keywords */
  dictionary?: Record<string, string>
}

/**
 * markdown-it plugin replacing `@md-reader/markdown-it-mermaid` (mermaid 9
 * only). Fences become placeholders; see `@/plugins/mermaid-renderer`.
 */
export default function MermaidBlockPlugin(
  md: MarkdownIt,
  { dictionary = {}, ...config }: MermaidOptions = {},
) {
  const { token: fenceToken = 'mermaid', ...words } = dictionary
  setMermaidConfig(config)

  const replacer = (_: string, p1: string, p2: string, p3: string) => {
    p1 = words[p1] ?? p1
    p2 = words[p2] ?? p2
    return p2 === '' ? `${p1}\n` : `${p1} ${p2}${p3}`
  }

  const fallbackFence = md.renderer.rules.fence?.bind(md.renderer.rules)

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    if (token.info.trim() === fenceToken) {
      let code = token.content.trim()
      if (Object.keys(words).length) {
        code = code.replace(/(.*?)[ \n](.*?)([ \n])/, replacer)
      }
      return renderMermaidPlaceholder(code)
    }
    return fallbackFence
      ? fallbackFence(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options)
  }
}
