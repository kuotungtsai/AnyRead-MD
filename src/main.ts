import throttle from 'lodash.throttle'
import Event from '@/core/event'
import storage from '@/core/storage'
import Ele, { svg } from '@/core/ele'
import { initPlugins } from '@/plugins'
import lifecycle from '@/core/lifecycle'
import className from '@/config/class-name'
import type { Theme } from '@/config/page-themes'
import { getDefaultData, getDefaultMdConfig, type Data } from '@/core/data'
import { mdRender, type MdOptions } from '@/core/markdown'
import { createFileTree, isFileProtocol } from '@/core/files'
import { createEditor } from '@/core/editor'
import { startTour, type TourStep } from '@/core/tour'
import i18n from '@/config/i18n'
import {
  getHeads,
  getRawContainer,
  setTheme,
  CONTENT_TYPES,
  darkMediaQuery,
  getMediaQueryTheme,
  toTheme,
} from '@/shared'
import codeIcon from '@/images/icon_code.svg'
import sideIcon from '@/images/icon_side.svg'
import goTopIcon from '@/images/icon_go_top.svg'
import editIcon from '@/images/icon_edit.svg'
import '@/style/index.less'

function main(data: Data) {
  const configData = getDefaultData(data)
  const actions = {
    reload() {
      window.location.reload()
    },
    updateMdPlugins() {
      reloading = true
      if (mdRaw) {
        contentRender(editorDraft ?? mdRaw)
        renderSide()
      } else {
        window.location.reload()
      }
      reloading = false
    },
    updatePageTheme(theme: Theme, prevTheme: Theme) {
      setTheme(theme)
      renderContentByTheme(theme, prevTheme)
    },
    toggleRefresh(value) {
      clearTimeout(pollingTimer)
      value && polling()
    },
    toggleCentered(value) {
      mdContent.classList.toggle('centered', value)
    },
    toggleSide() {
      onToggleSide()
    },
    startTour() {
      mounted && runTour()
    },
  }
  let mounted = false
  chrome.runtime.onMessage.addListener(({ action, data: { key, value } }) => {
    const oldValue = configData[key]
    configData[key] = value
    actions[action]?.(value, oldValue)
  })

  if (!configData.enable || !CONTENT_TYPES.includes(document.contentType)) {
    return
  }

  let pollingTimer: number = null
  let reloading: boolean = false
  let mdRaw: string = null
  let isSideHover: boolean = false
  let globalEvent: Event = new Event()

  initPlugins({ event: globalEvent })

  /* init md page */
  setTheme(configData.pageTheme)
  document.body.classList.toggle(
    className.SIDE_COLLAPSED,
    configData.hiddenSide,
  )

  const rawContainer = getRawContainer()
  lifecycle.init(rawContainer)
  mdRaw = rawContainer?.textContent

  /* render content */
  const mdContent = new Ele<HTMLElement>('article', {
    className: `${className.MD_CONTENT} ${
      configData.centered ? 'centered' : ''
    }`,
  })

  const localize = i18n(configData.language)

  const mdRenderer =
    (target: HTMLElement | Ele) =>
    (code: string = '', options?: MdOptions) => {
      const mdConfig = getDefaultMdConfig(configData.mdConfig)
      target.innerHTML = mdRender(code, {
        theme: toTheme(configData.pageTheme),
        plugins: configData.mdPlugins,
        config: mdConfig.core,
        pluginOptions: mdConfig.plugins,
        ...options,
      })
      const ele = target instanceof Ele ? target.ele : target
      document.title = ele.querySelector('h1')?.textContent.trim() ?? ''
      editor?.syncTitle()
      globalEvent.emit(
        'contentRendered',
        target instanceof Ele ? target.ele : target,
      )
    }
  let editor: ReturnType<typeof createEditor> = null
  const contentRender = mdRenderer(mdContent)
  contentRender(mdRaw)

  /* advanced markdown config changed in the options page */
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || (!changes.mdConfig && !changes.mdPlugins)) return
    if (changes.mdConfig) configData.mdConfig = changes.mdConfig.newValue
    if (changes.mdPlugins) configData.mdPlugins = changes.mdPlugins.newValue
    reloading = true
    // keep an unsaved draft in the preview if there is one
    contentRender(editorDraft ?? mdRaw)
    renderSide()
    reloading = false
  })
  /* unsaved editor content, null when nothing pending */
  let editorDraft: string = null

  mdContent.on(
    'click',
    async e => {
      globalEvent.emit('click', e.target)
    },
    true,
  )

  const mdBody = new Ele<HTMLElement>(
    'main',
    { className: className.MD_BODY },
    mdContent,
  )

  /* render side: tabs (outline / files) + panels */
  const mdSide = new Ele<HTMLElement>('div', { className: className.MD_SIDE })
  const tocList = new Ele<HTMLElement>('ul', {
    className: className.MD_SIDE_TOC,
  })
  const fileTree = isFileProtocol()
    ? createFileTree({
        up: localize('files_up'),
        empty: localize('files_empty'),
        error: localize('files_error'),
      })
    : null
  if (fileTree) {
    const tabs = new Ele<HTMLElement>('div', {
      className: className.MD_SIDE_TABS,
    })
    const tocTab = new Ele<HTMLElement>('button', {
      className: className.MD_SIDE_TAB,
    })
    tocTab.textContent = localize('tab_toc')
    const filesTab = new Ele<HTMLElement>('button', {
      className: className.MD_SIDE_TAB,
    })
    filesTab.textContent = localize('tab_files')
    tabs.append([tocTab, filesTab])
    mdSide.append([tabs, tocList, fileTree.panel])

    const switchTab = (tab: 'toc' | 'files', persist = true) => {
      const isFiles = tab === 'files'
      tocTab.classList.toggle(className.MD_SIDE_TAB_ACTIVE, !isFiles)
      filesTab.classList.toggle(className.MD_SIDE_TAB_ACTIVE, isFiles)
      tocList.toggle(!isFiles)
      fileTree.panel.toggle(isFiles)
      if (isFiles) fileTree.ensureLoaded()
      if (persist) {
        configData.sideTab = tab
        storage.set('sideTab', tab)
      }
    }
    tocTab.on('click', () => switchTab('toc'))
    filesTab.on('click', () => switchTab('files'))
    switchTab(configData.sideTab === 'files' ? 'files' : 'toc', false)
  } else {
    mdSide.append(tocList)
  }
  let idCache: { [content: string]: number } = Object.create(null)
  let headElements: HTMLElement[] = []
  let sideLiElements: HTMLElement[] = []
  let df: Ele<DocumentFragment> = null
  let targetIndex: number = null
  mdSide.on('mouseenter', () => {
    isSideHover = true
  })
  mdSide.on('mouseleave', () => {
    isSideHover = false
  })

  renderSide()
  document.addEventListener('scroll', throttle(onScroll, 100))

  /* render raw toggle button */
  const rawToggleBtn = new Ele<HTMLElement>(
    'button',
    {
      className: [className.MD_BUTTON, className.CODE_TOGGLE_BTN],
      title: 'Toggle raw',
    },
    svg(codeIcon),
  )
  rawToggleBtn.on('click', () => {
    editor.close()
    lifecycle.toggleRaw([mdBody, mdSide])
  })

  /* edit mode */
  editor = createEditor({
    labels: {
      save: localize('editor_save'),
      saveAs: localize('editor_save_as'),
      close: localize('editor_close'),
      saved: localize('editor_saved'),
      unsaved: localize('editor_unsaved'),
      saveFailed: localize('editor_save_failed'),
      firstSaveHint: localize('editor_first_save_hint'),
    },
    getContent: () => editorDraft ?? mdRaw,
    onInput(content) {
      editorDraft = content
      contentRender(content)
      renderSide()
    },
    onSaved(content) {
      editorDraft = null
      mdRaw = content
      if (rawContainer) rawContainer.textContent = content
    },
  })
  const editToggleBtn = new Ele<HTMLElement>(
    'button',
    {
      className: [className.MD_BUTTON, className.EDIT_TOGGLE_BTN],
      title: `${localize('editor_toggle')} (Alt+Shift+E)`,
    },
    svg(editIcon),
  )
  editToggleBtn.on('click', () => editor.toggle())
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.altKey && e.shiftKey && e.code === 'KeyE') {
      e.preventDefault()
      editor.toggle()
    }
  })

  /* render side expand button */
  const sideExpandBtn = new Ele<HTMLElement>(
    'button',
    {
      className: [className.MD_BUTTON, className.SIDE_EXPAND_BTN],
      title: 'Expand side',
    },
    svg(sideIcon),
  )
  sideExpandBtn.on('click', () => {
    chrome.runtime.sendMessage({
      action: 'storage',
      data: {
        key: 'hiddenSide',
        value: !configData.hiddenSide,
      },
    })
  })
  function onToggleSide() {
    if (window.innerWidth <= 960) {
      const value = document.body.classList.toggle(className.SIDE_EXPANDED)
      mdBody.off('click', foldSide, true)
      window.removeEventListener('resize', foldSide)
      document.removeEventListener('keydown', foldSide)
      if (value) {
        setTimeout(() => {
          mdBody.on('click', foldSide, { capture: true, once: true })
          window.addEventListener('resize', foldSide, { once: true })
          document.addEventListener('keydown', foldSide, { once: true })
        }, 0)
      }
    } else {
      configData.hiddenSide = document.body.classList.toggle(
        className.SIDE_COLLAPSED,
      )
    }
  }
  function foldSide(e: UIEvent) {
    if (e.type === 'keydown' && (e as KeyboardEvent).code !== 'Escape') {
      return
    }
    document.body.classList.remove(className.SIDE_EXPANDED)
    mdBody.off('click', foldSide, true)
    window.removeEventListener('resize', foldSide)
    document.removeEventListener('keydown', foldSide)
    e.stopPropagation()
    e.preventDefault()
    return false
  }
  /* render go top button */
  const goTopBtn = new Ele<HTMLElement>(
    'button',
    {
      className: [className.MD_BUTTON, className.GO_TOP_BTN],
      title: 'Go top',
    },
    svg(goTopIcon),
  )
  goTopBtn.hide()
  goTopBtn.on('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))

  const buttonWrap = new Ele<HTMLElement>(
    'div',
    { className: className.BUTTON_WRAP_ELE },
    [sideExpandBtn, editToggleBtn, rawToggleBtn, goTopBtn],
  )

  /* mount elements */
  lifecycle.mount([buttonWrap, mdBody, mdSide, editor.panel])
  updateAnchorPosition()
  mounted = true

  /* first-run quick tutorial */
  if (!configData.tourDone) {
    setTimeout(runTour, 800)
  }

  function runTour() {
    const t = localize
    const steps: TourStep[] = [
      { title: t('tour_welcome_title'), body: t('tour_welcome_body') },
      fileTree
        ? {
            target: `.${className.MD_SIDE_TABS}`,
            title: t('tour_side_title'),
            body: t('tour_side_body'),
          }
        : {
            target: `.${className.MD_SIDE}`,
            title: t('tour_toc_title'),
            body: t('tour_toc_body'),
          },
      {
        target: `.${className.EDIT_TOGGLE_BTN}`,
        title: t('tour_edit_title'),
        body: t('tour_edit_body'),
      },
      {
        target: `.${className.CODE_TOGGLE_BTN}`,
        title: t('tour_raw_title'),
        body: t('tour_raw_body'),
      },
      { title: t('tour_folder_title'), body: t('tour_folder_body') },
      { title: t('tour_settings_title'), body: t('tour_settings_body') },
      { title: t('tour_done_title'), body: t('tour_done_body') },
    ]
    editor.close()
    startTour(
      steps,
      {
        next: t('tour_next'),
        prev: t('tour_prev'),
        skip: t('tour_skip'),
        done: t('tour_finish'),
      },
      () => {
        configData.tourDone = true
        storage.set('tourDone', true)
      },
    )
  }

  darkMediaQuery.addEventListener('change', (e: MediaQueryListEvent) => {
    if (configData.pageTheme === 'auto') {
      renderContentByTheme(
        e.matches ? 'light' : 'dark',
        e.matches ? 'dark' : 'light',
      )
    }
  })

  /* auto refresh */
  if (configData.refresh) {
    polling()
  }

  function polling() {
    void (function watch() {
      clearTimeout(pollingTimer)
      chrome.runtime.sendMessage({ action: 'fetch' }, res => {
        // never overwrite the editor's draft with file content
        if (res !== undefined && editorDraft === null) {
          if (mdRaw === undefined || mdRaw === null) {
            if (res) {
              window.location.reload()
              return
            }
          } else if (mdRaw !== res) {
            mdRaw = res
            contentRender(res)
            renderSide()
            /* update raw content */
            setTimeout(() => {
              rawContainer.textContent = res
            }, 0)
          }
        }
        pollingTimer = setTimeout(watch, 500)
      })
    })()
  }

  function renderSide() {
    idCache = Object.create(null)
    headElements = getHeads(mdContent)
    df = new Ele<DocumentFragment>('#document-fragment')
    sideLiElements = headElements.reduce(handleHeadItem, [])
    tocList.innerHTML = null
    tocList.append(df)
    setTimeout(onScroll, 0)
  }

  function handleHeadItem(
    eleList: HTMLElement[],
    head: HTMLElement,
  ): HTMLElement[] {
    const content = String(head.textContent).trim()
    const encodeContent = getDecodeContent(content)

    head.setAttribute('id', encodeContent)

    const headAnchor = new Ele<HTMLElement>('a', {
      className: className.HEAD_ANCHOR,
      href: `#${encodeContent}`,
    })
    headAnchor.textContent = '#'
    head.insertBefore(headAnchor.ele, head.firstChild)

    const link = new Ele<HTMLElement>('a', {
      title: content,
      href: `#${encodeContent}`,
    })
    link.textContent = content
    const li = new Ele<HTMLElement>('li', {
      className: `${className.MD_SIDE}-${head.tagName.toLowerCase()}`,
    })
    eleList.push(li.ele)
    li.append(link)
    df.append(li.ele)

    return eleList
  }

  function getDecodeContent(content: string): string {
    return (function unique(key: string): string {
      if (key in idCache) {
        return unique(`${key}-${idCache[key]++}`)
      } else {
        idCache[key] = 1
        return key
      }
    })(encodeURIComponent(content.toLowerCase().replace(/\s+/g, '-')))
  }

  function onScroll() {
    const documentScrollTop = document.documentElement.scrollTop
    goTopBtn.toggle(documentScrollTop >= 640)

    headElements.some((_, index) => {
      let sectionHeight = -20
      const item = headElements[index + 1]
      if (item) {
        sectionHeight += item.offsetTop
      }

      const hit = sectionHeight <= 0 || sectionHeight > documentScrollTop

      if (hit && (targetIndex !== index || reloading)) {
        let target = sideLiElements[targetIndex]
        target && target.classList.remove(className.MD_SIDE_ACTIVE)

        target = sideLiElements[(targetIndex = index)]
        if (target) {
          target.classList.add(className.MD_SIDE_ACTIVE)
          if (!isSideHover && target.scrollIntoView) {
            target.scrollIntoView({ block: 'nearest' })
          }
        }
      }
      return hit
    })
  }

  function renderContentByTheme(theme: Theme, prevTheme: Theme) {
    if (configData.mdPlugins.includes('Mermaid')) {
      if (theme === 'auto' || prevTheme === 'auto') {
        const themeScheme = getMediaQueryTheme()
        if (theme !== themeScheme && prevTheme !== themeScheme) {
          contentRender(editorDraft ?? mdRaw)
          renderSide()
        }
      } else {
        contentRender(editorDraft ?? mdRaw)
        renderSide()
      }
    }
  }

  function updateAnchorPosition() {
    if (window.location.hash) {
      setTimeout(() => {
        const hash = window.location.hash.slice(1)
        const target = headElements.find(head => {
          return head.getAttribute('id') === hash
        })
        if (target) {
          const top = target.offsetTop
          top && window.scrollTo(0, top)
        }
      })
    }
  }
}

storage.get().then(main)
