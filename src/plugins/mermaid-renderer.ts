import mermaid from 'mermaid'
import {
  decodeMermaidSource,
  getMermaidConfig,
  MERMAID_CLASS,
  MERMAID_ERROR_CLASS,
  MERMAID_SOURCE_ATTR,
  MERMAID_STATUS_ATTR,
} from '@/core/mermaid'

let renderId = 0
let lastConfig = ''

function initialize() {
  const config = getMermaidConfig()
  const key = JSON.stringify(config)
  if (key !== lastConfig) {
    mermaid.initialize(config)
    lastConfig = key
  }
}

async function renderMermaidElement(element: HTMLElement) {
  if (element.getAttribute(MERMAID_STATUS_ATTR) !== 'pending') return
  const source = element.getAttribute(MERMAID_SOURCE_ATTR)
  if (!source) return
  element.setAttribute(MERMAID_STATUS_ATTR, 'rendering')

  const code = decodeMermaidSource(source)
  const id = `mermaid-render-${++renderId}`
  try {
    // mermaid sanitises labels with DOMPurify (securityLevel: 'strict')
    const { svg, bindFunctions } = await mermaid.render(id, code)
    element.innerHTML = svg
    bindFunctions?.(element)
    element.setAttribute(MERMAID_STATUS_ATTR, 'ready')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const pre = document.createElement('pre')
    pre.className = MERMAID_ERROR_CLASS
    pre.textContent = message
    element.replaceWith(pre)
    // mermaid leaves its temporary error graphic behind on failure
    document.getElementById(`d${id}`)?.remove()
    document.getElementById(id)?.remove()
  }
}

export async function renderMermaid(container: ParentNode = document) {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(
      `.${MERMAID_CLASS}[${MERMAID_SOURCE_ATTR}]`,
    ),
  )
  if (!elements.length) return
  initialize()
  // mermaid.render() is not safe to run concurrently: render one at a time
  for (const element of elements) {
    if (!element.isConnected) continue
    await renderMermaidElement(element)
  }
}

let queue: Promise<void> = Promise.resolve()

export default function MermaidRendererPlugin({ event }) {
  event.on('contentRendered', (container: HTMLElement) => {
    queue = queue.then(() => renderMermaid(container)).catch(console.error)
  })
}
