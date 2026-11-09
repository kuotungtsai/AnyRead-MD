import { encodeGraphvizSource, decodeGraphvizSource } from '@/core/graphviz'

/**
 * Mermaid >= 10 renders asynchronously, so the markdown-it fence rule only
 * emits a placeholder holding the (base64) source. The `mermaid-renderer`
 * plugin turns placeholders into SVG once the HTML is in the page.
 */
export const MERMAID_CLASS = 'mermaid'
export const MERMAID_SOURCE_ATTR = 'data-mermaid-source'
export const MERMAID_STATUS_ATTR = 'data-mermaid-status'
export const MERMAID_ERROR_CLASS = 'md-reader__mermaid-error'

export const encodeMermaidSource = encodeGraphvizSource
export const decodeMermaidSource = decodeGraphvizSource

/** Options given to mermaid.initialize() by the renderer (set per md render) */
let mermaidConfig: Record<string, any> = { theme: 'default' }

export function setMermaidConfig(config: Record<string, any>) {
  mermaidConfig = { ...config }
}

export function getMermaidConfig(): Record<string, any> {
  return {
    startOnLoad: false,
    ...mermaidConfig,
    // never let saved options loosen sanitising of diagram labels
    securityLevel: 'strict',
  }
}

export function renderMermaidPlaceholder(code: string): string {
  return `<pre class="${MERMAID_CLASS}" ${MERMAID_SOURCE_ATTR}="${encodeMermaidSource(
    code,
  )}" ${MERMAID_STATUS_ATTR}="pending">${escapeHtml(code)}</pre>`
}

function escapeHtml(content: string): string {
  return String(content)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
