/**
 * First-run guided tour for the markdown viewer page.
 * Each step optionally highlights an element; steps whose element is missing
 * or off-screen (e.g. Files tab on http pages, collapsed side bar) are skipped.
 */
export interface TourStep {
  target?: string
  title: string
  body: string
}

export interface TourLabels {
  next: string
  prev: string
  skip: string
  done: string
}

const STYLE_ID = 'md-reader-tour-style'
const STYLE = `
.mdr-tour-mask{position:fixed;inset:0;z-index:2147483000;background:rgba(15,20,30,.55)}
.mdr-tour-spot{position:fixed;z-index:2147483001;border-radius:10px;box-shadow:0 0 0 9999px rgba(15,20,30,.55),0 0 0 3px #3ddc9a;transition:all .25s ease;pointer-events:none}
.mdr-tour-card{position:fixed;z-index:2147483002;width:340px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:18px 20px 14px;border-radius:12px;background:#fff;color:#2d3d50;box-shadow:0 12px 40px rgba(0,0,0,.25);font:14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Microsoft JhengHei',sans-serif;transition:top .25s ease,left .25s ease}
.mdr-tour-card h3{margin:0 0 6px;font-size:16px;color:#1e2530}
.mdr-tour-card p{margin:0;white-space:pre-line}
.mdr-tour-card kbd{padding:1px 6px;border:1px solid #d0d7de;border-bottom-width:2px;border-radius:4px;font-size:12px;background:#f6f8fa}
.mdr-tour-foot{display:flex;align-items:center;gap:8px;margin-top:14px}
.mdr-tour-count{flex:1;font-size:12px;color:#909090}
.mdr-tour-foot button{padding:5px 14px;border:1px solid #d0d7de;border-radius:6px;background:#fff;color:#2d3d50;font-size:13px;cursor:pointer}
.mdr-tour-foot button.primary{border-color:#1fbfa0;background:linear-gradient(135deg,#3ddc9a,#00c4d4);color:#fff;font-weight:600}
.mdr-tour-foot button.skip{border:none;background:none;color:#909090;padding:5px 4px}
@media (prefers-color-scheme:dark){.mdr-tour-card{background:#23262c;color:#d5d9e0}.mdr-tour-card h3{color:#fff}.mdr-tour-foot button{background:#2c3038;color:#d5d9e0;border-color:#3a3f48}.mdr-tour-card kbd{background:#2c3038;border-color:#3a3f48}}
`

function visibleRect(selector?: string): DOMRect | null {
  if (!selector) return null
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  const onScreen =
    r.width > 0 &&
    r.height > 0 &&
    r.right > 0 &&
    r.bottom > 0 &&
    r.left < window.innerWidth &&
    r.top < window.innerHeight
  return onScreen && getComputedStyle(el).visibility !== 'hidden' ? r : null
}

/** escape text, then turn `Alt+Shift+E` style tokens wrapped in [[ ]] into <kbd> */
function format(text: string): string {
  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return esc.replace(/\[\[(.+?)\]\]/g, '<kbd>$1</kbd>')
}

export function startTour(
  allSteps: TourStep[],
  labels: TourLabels,
  onFinish: () => void,
) {
  if (document.querySelector('.mdr-tour-card')) return
  // keep steps with no target, or whose target is currently visible
  const steps = allSteps.filter(s => !s.target || visibleRect(s.target))
  if (!steps.length) return

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = STYLE
    document.head.appendChild(style)
  }

  const mask = document.createElement('div')
  mask.className = 'mdr-tour-mask'
  const spot = document.createElement('div')
  spot.className = 'mdr-tour-spot'
  const card = document.createElement('div')
  card.className = 'mdr-tour-card'
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-modal', 'true')
  document.body.append(mask, spot, card)

  let index = 0

  function place() {
    const step = steps[index]
    const rect = visibleRect(step.target)
    const pad = 6
    if (rect) {
      mask.style.display = 'none' // the spotlight shadow dims the page
      spot.style.display = 'block'
      Object.assign(spot.style, {
        top: `${rect.top - pad}px`,
        left: `${rect.left - pad}px`,
        width: `${rect.width + pad * 2}px`,
        height: `${rect.height + pad * 2}px`,
      })
    } else {
      mask.style.display = 'block'
      spot.style.display = 'none'
    }

    const cw = card.offsetWidth
    const ch = card.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    let top: number
    let left: number
    if (!rect) {
      top = (vh - ch) / 2
      left = (vw - cw) / 2
    } else if (rect.right + 16 + cw < vw) {
      // right of target
      left = rect.right + 16
      top = rect.top
    } else if (rect.bottom + 16 + ch < vh) {
      // below target
      top = rect.bottom + 16
      left = rect.right - cw
    } else {
      // left of target
      left = rect.left - 16 - cw
      top = rect.top
    }
    card.style.top = `${Math.max(16, Math.min(top, vh - ch - 16))}px`
    card.style.left = `${Math.max(16, Math.min(left, vw - cw - 16))}px`
  }

  function render() {
    const step = steps[index]
    const last = index === steps.length - 1
    card.innerHTML = `
      <h3>${format(step.title)}</h3>
      <p>${format(step.body)}</p>
      <div class="mdr-tour-foot">
        <span class="mdr-tour-count">${index + 1} / ${steps.length}</span>
        ${
          last
            ? ''
            : `<button class="skip" data-act="skip">${format(
                labels.skip,
              )}</button>`
        }
        ${
          index ? `<button data-act="prev">${format(labels.prev)}</button>` : ''
        }
        <button class="primary" data-act="next">${format(
          last ? labels.done : labels.next,
        )}</button>
      </div>`
    place()
    card.querySelector<HTMLButtonElement>('.primary')?.focus()
  }

  function close() {
    mask.remove()
    spot.remove()
    card.remove()
    window.removeEventListener('resize', place)
    window.removeEventListener('scroll', place, true)
    document.removeEventListener('keydown', onKey, true)
    onFinish()
  }

  function go(delta: number) {
    const next = index + delta
    if (next >= steps.length) return close()
    if (next < 0) return
    index = next
    render()
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    }
  }

  card.addEventListener('click', e => {
    const act = (e.target as HTMLElement).closest('button')?.dataset.act
    if (act === 'next') go(1)
    else if (act === 'prev') go(-1)
    else if (act === 'skip') close()
  })
  mask.addEventListener('click', close)
  window.addEventListener('resize', place)
  window.addEventListener('scroll', place, true)
  document.addEventListener('keydown', onKey, true)

  render()
}
