<script lang="ts">
  import storage from '@/core/storage'
  import MD_PLUGINS, { CONFIGURABLE } from '@/config/md-plugins'
  import i18n from '@/config/i18n'
  import {
    getDefaultData,
    getDefaultMdConfig,
    type MdConfig,
    type MdCoreConfig,
  } from '@/core/data'

  let localize = i18n()

  // Example options shown as placeholders (not applied unless typed in)
  const EXAMPLES: Record<string, string> = {
    Linkify: '{ "fuzzyLink": true, "fuzzyEmail": true, "fuzzyIP": false }',
    Emoji: '{ "shortcuts": { "smile": [":)"] } }',
    TOC: '{ "includeLevel": [1, 2, 3], "containerHeaderHtml": "<b>Contents</b>" }',
    Katex: '{ "throwOnError": false, "macros": { "\\\\RR": "\\\\mathbb{R}" } }',
    Mermaid: '{ "theme": "forest" }',
    TaskLists: '{ "enabled": true, "label": true }',
    MultimdTable: '{ "multiline": true, "rowspan": true, "headerless": true }',
    Frontmatter: '{ "collapsed": true, "title": "Metadata" }',
  }

  type Row =
    | { kind: 'core'; key: keyof MdCoreConfig; label: string; desc: string; options?: string }
    | { kind: 'plugin'; key: string; label: string; desc: string; options?: string }

  let config: MdConfig = getDefaultMdConfig()
  let enabled: string[] = [...MD_PLUGINS]
  let texts: Record<string, string> = {}
  let errors: Record<string, string> = {}
  let openGear: Record<string, boolean> = {}
  let status = ''
  let rows: Row[] = []

  /* welcome / quick start (opened automatically after install) */
  let showWelcome = location.hash === '#welcome'
  let fileAccess = true
  function checkFileAccess() {
    chrome.extension.isAllowedFileSchemeAccess(v => (fileAccess = !!v))
  }
  checkFileAccess()
  // re-check when the user comes back from the extensions page
  window.addEventListener('focus', checkFileAccess)
  function openExtensionPage() {
    chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` })
  }

  $: rows = [
    { kind: 'core', key: 'breaks', label: localize('opt_breaks'), desc: localize('opt_breaks_desc') },
    { kind: 'core', key: 'linkify', label: localize('opt_linkify'), desc: localize('opt_linkify_desc'), options: 'Linkify' },
    { kind: 'core', key: 'typographer', label: localize('opt_typographer'), desc: localize('opt_typographer_desc') },
    { kind: 'core', key: 'html', label: localize('opt_html'), desc: localize('opt_html_desc') },
    ...MD_PLUGINS.map(name => ({
      kind: 'plugin' as const,
      key: name,
      label: localize(name),
      desc: localize(`desc_${name}`),
      options: CONFIGURABLE.includes(name) ? name : undefined,
    })),
  ]
  $: allOn = enabled.length === MD_PLUGINS.length

  storage.get().then(raw => {
    const data = getDefaultData(raw)
    localize = i18n(data.language)
    config = data.mdConfig
    enabled = [...data.mdPlugins]
    texts = Object.fromEntries(
      CONFIGURABLE.map(name => {
        const opts = config.plugins[name]
        return [name, opts && Object.keys(opts).length ? JSON.stringify(opts, null, 2) : '']
      }),
    )
  })

  function flash(text: string) {
    status = text
    setTimeout(() => status === text && (status = ''), 2000)
  }

  async function saveConfig() {
    await storage.set('mdConfig', config)
    flash(localize('opt_saved'))
  }

  async function savePlugins() {
    await storage.set({ mdPlugins: enabled, pluginsMigrated: true })
    flash(localize('opt_saved'))
  }

  function toggle(row: Row) {
    if (row.kind === 'core') {
      config = { ...config, core: { ...config.core, [row.key]: !config.core[row.key] } }
      saveConfig()
    } else {
      enabled = enabled.includes(row.key)
        ? enabled.filter(p => p !== row.key)
        : MD_PLUGINS.filter(p => p === row.key || enabled.includes(p))
      savePlugins()
    }
  }

  function toggleAll() {
    enabled = allOn ? [] : [...MD_PLUGINS]
    savePlugins()
  }

  function applyOptions(name: string) {
    const raw = (texts[name] || '').trim()
    let value: Record<string, any> = {}
    if (raw) {
      try {
        value = JSON.parse(raw)
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('{ ... }')
        }
      } catch (err) {
        errors = { ...errors, [name]: `${localize('opt_json_error')}: ${err.message}` }
        return
      }
    }
    errors = { ...errors, [name]: '' }
    const plugins = { ...config.plugins }
    if (Object.keys(value).length) plugins[name] = value
    else delete plugins[name]
    config = { ...config, plugins }
    saveConfig()
  }

  async function resetAll() {
    config = getDefaultMdConfig()
    enabled = [...MD_PLUGINS]
    texts = {}
    errors = {}
    await storage.set({ mdConfig: config, mdPlugins: enabled, pluginsMigrated: true })
    flash(localize('opt_saved'))
  }
</script>

{#if showWelcome}
  <section class="welcome">
    <h1>{localize('welcome_title')}</h1>
    <p class="lead">{localize('welcome_lead')}</p>
    <ol>
      <li>
        <div class="step-title">
          {localize('welcome_step1')}
          {#if fileAccess}<span class="ok">✓ {localize('welcome_enabled')}</span>{/if}
        </div>
        <div class="desc">{localize('welcome_step1_desc')}</div>
        {#if !fileAccess}
          <button class="apply" on:click={openExtensionPage}
            >{localize('welcome_open_ext')}</button
          >
        {/if}
      </li>
      <li>
        <div class="step-title">{localize('welcome_step2')}</div>
        <div class="desc">{localize('welcome_step2_desc')}</div>
      </li>
      <li>
        <div class="step-title">{localize('welcome_step3')}</div>
        <div class="desc">{localize('welcome_step3_desc')}</div>
      </li>
    </ol>
    <button class="reset" on:click={() => (showWelcome = false)}
      >{localize('welcome_to_settings')}</button
    >
  </section>
{/if}

<main class:hidden={showWelcome}>
  <header>
    <h1>{localize('label_md-plugins')}</h1>
    <span class="status">{status}</span>
  </header>

  <div class="list">
    <div class="row">
      <div class="text">
        <div class="name">{localize('opt_all')}</div>
        <div class="desc">{localize('opt_all_desc')}</div>
      </div>
      <button
        class="switch"
        class:on={allOn}
        role="switch"
        aria-checked={allOn}
        on:click={toggleAll}><span /></button
      >
    </div>

    {#each rows as row (row.kind + row.key)}
      <div class="row">
        <div class="text">
          <div class="name">{row.label}</div>
          <div class="desc">{row.desc}</div>
        </div>
        {#if row.options}
          <button
            class="gear"
            class:active={openGear[row.options] || config.plugins[row.options]}
            title="Options"
            on:click={() => (openGear = { ...openGear, [row.options]: !openGear[row.options] })}
            >⚙</button
          >
        {/if}
        <button
          class="switch"
          class:on={row.kind === 'core' ? config.core[row.key] : enabled.includes(row.key)}
          role="switch"
          aria-checked={row.kind === 'core' ? !!config.core[row.key] : enabled.includes(row.key)}
          on:click={() => toggle(row)}><span /></button
        >
      </div>
      {#if row.options && openGear[row.options]}
        <div class="options">
          <div class="desc">{localize('opt_json_hint')}</div>
          <textarea
            rows="4"
            spellcheck="false"
            placeholder={EXAMPLES[row.options] || '{ }'}
            bind:value={texts[row.options]}
            class:invalid={errors[row.options]}
          />
          {#if errors[row.options]}<div class="error">{errors[row.options]}</div>{/if}
          <button class="apply" on:click={() => applyOptions(row.options)}
            >{localize('opt_apply')}</button
          >
        </div>
      {/if}
    {/each}
  </div>

  <footer>
    <button class="reset" on:click={resetAll}>{localize('opt_reset')}</button>
  </footer>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft JhengHei', sans-serif;
    color: #2d3d50;
    background: #f4f5f7;
  }
  main {
    max-width: 720px;
    margin: 32px auto;
    padding: 28px 36px;
    border-radius: 14px;
    background: #fff;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  h1 {
    margin: 0 0 16px;
    font-size: 26px;
  }
  .status {
    font-size: 13px;
    color: #2fc178;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 0;
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .name {
    font-size: 16px;
    font-weight: 600;
    color: #35425f;
  }
  .desc {
    margin-top: 2px;
    font-size: 13px;
    color: #9aa1ad;
  }
  .gear {
    width: 30px;
    height: 30px;
    padding: 0;
    border: none;
    border-radius: 8px;
    font-size: 20px;
    line-height: 30px;
    color: #607cd2;
    background: transparent;
    cursor: pointer;
  }
  .gear:hover,
  .gear.active {
    background: rgba(96, 124, 210, 0.12);
  }
  .switch {
    position: relative;
    flex: none;
    width: 52px;
    height: 30px;
    padding: 0;
    border: none;
    border-radius: 15px;
    background: #e6e8ec;
    cursor: pointer;
    transition: background 0.2s;
  }
  .switch span {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s;
  }
  .switch.on {
    background: #b8c5ee;
  }
  .switch.on span {
    transform: translateX(22px);
  }
  .options {
    margin: -4px 0 10px;
    padding: 12px 14px;
    border-radius: 10px;
    background: #f7f8fb;
  }
  textarea {
    box-sizing: border-box;
    width: 100%;
    margin-top: 6px;
    padding: 8px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-family: Consolas, monospace;
    font-size: 12px;
    resize: vertical;
  }
  textarea.invalid {
    border-color: #ff6767;
  }
  .error {
    font-size: 12px;
    color: #ff6767;
  }
  .apply,
  .reset {
    margin-top: 8px;
    padding: 5px 16px;
    border: 1px solid #607cd2;
    border-radius: 6px;
    color: #fff;
    background: #607cd2;
    cursor: pointer;
  }
  .reset {
    color: #607cd2;
    background: #fff;
  }
  footer {
    margin-top: 16px;
  }
  main.hidden {
    display: none;
  }
  .welcome {
    max-width: 720px;
    margin: 32px auto;
    padding: 28px 36px;
    border-radius: 14px;
    background: #fff;
  }
  .welcome .lead {
    color: #586069;
  }
  .welcome ol {
    padding-left: 20px;
  }
  .welcome li {
    margin: 14px 0;
  }
  .step-title {
    font-size: 16px;
    font-weight: 600;
    color: #35425f;
  }
  .ok {
    margin-left: 8px;
    font-size: 13px;
    color: #2fc178;
  }
  .welcome .desc {
    white-space: pre-line;
  }
</style>
