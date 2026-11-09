<script lang="ts">
  import storage from '@/core/storage'
  import Warning from './warning.svelte'
  import Header from './header.svelte'
  import MD_PLUGINS from '@/config/md-plugins'
  import PAGE_THEMES from '@/config/page-themes'
  import { getDefaultData, type Data } from '@/core/data'
  import i18n from '@/config/i18n'

  let localize = i18n()
  let isAllowViewFile = true
  let data = getDefaultData()

  // Get if file allowed access
  chrome.extension.isAllowedFileSchemeAccess(
    (isAllow: boolean) => (isAllowViewFile = !!isAllow),
  )

  storage.get().then((_data: Data) => {
    // need an assignment to updata UI
    data = getDefaultData(_data)
  })

  $: if (data.language) {
    updateConfig('language', data.language)
    changeLocale(data.language)
  }

  function updateConfig(key, value) {
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: 'storage', data: { key, value } })
    }, 0)
  }

  function savePlugins() {
    updateConfig('pluginsMigrated', true)
    updateConfig('mdPlugins', data.mdPlugins)
  }

  type SwitchKey = 'enable' | 'centered' | 'refresh' | 'dirView'
  const SWITCHES: Array<[SwitchKey, string]> = [
    ['enable', 'label_enable'],
    ['centered', 'label_centered'],
    ['refresh', 'label_auto-refresh'],
    ['dirView', 'label_dir_view'],
  ]

  function toggleSwitch(key: SwitchKey) {
    if (key !== 'enable' && !data.enable) return
    data[key] = !data[key]
    updateConfig(key, data[key])
  }

  function togglePlugin(name: string) {
    if (!data.enable) return
    data.mdPlugins = data.mdPlugins.includes(name)
      ? data.mdPlugins.filter(p => p !== name)
      : MD_PLUGINS.filter(p => p === name || data.mdPlugins.includes(p))
    savePlugins()
  }

  function setTheme(mode: string) {
    data.pageTheme = mode as Data['pageTheme']
    updateConfig('pageTheme', mode)
  }

  function setAllPlugins(on: boolean) {
    if (!data.enable) return
    data.mdPlugins = on ? [...MD_PLUGINS] : []
    savePlugins()
  }

  function replayTour() {
    updateConfig('tourDone', false)
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const id = tabs[0]?.id
      if (id === undefined) return
      chrome.tabs.sendMessage(
        id,
        { action: 'startTour', data: { key: 'tourDone', value: false } },
        () => {
          // not a markdown tab: the tour will show on the next one opened
          void chrome.runtime.lastError
          window.close()
        },
      )
    })
  }

  function openOptions() {
    chrome.runtime.openOptionsPage()
  }

  function changeLocale(language) {
    localize = i18n(language)
  }
</script>

<main>
  <Header />

  {#if !isAllowViewFile}
    <Warning {localize} />
  {/if}

  <div class="form" disabled={!data.enable}>
    {#each SWITCHES as [key, label] (key)}
      <div class="form-item inline">
        <span class="label-item">{localize(label)}:</span>
        <button
          class="switch"
          class:on={data[key]}
          role="switch"
          aria-checked={!!data[key]}
          aria-label={localize(label)}
          disabled={key !== 'enable' && !data.enable}
          on:click={() => toggleSwitch(key)}><span></span></button
        >
      </div>
    {/each}

    <div class="form-item">
      <div class="label-item plugins-label">
        <span>{localize('label_md-plugins')}:</span>
        <span class="all-btns">
          <button disabled={!data.enable} on:click={() => setAllPlugins(true)}
            >{localize('opt_all_on')}</button
          >
          <button disabled={!data.enable} on:click={() => setAllPlugins(false)}
            >{localize('opt_all_off')}</button
          >
        </span>
      </div>
      <div class="chips">
        {#each MD_PLUGINS as chip (chip)}
          <button
            class="chip"
            class:selected={data.mdPlugins.includes(chip)}
            title={chip}
            aria-pressed={data.mdPlugins.includes(chip)}
            disabled={!data.enable}
            on:click={() => togglePlugin(chip)}>{localize(chip)}</button
          >
        {/each}
      </div>
    </div>

    <div class="form-item">
      <div class="label-item">{localize('label_theme')}:</div>
      <div class="radios">
        {#each PAGE_THEMES as mode (mode)}
          <label class="radio">
            <input
              type="radio"
              name="pageTheme"
              value={mode}
              checked={data.pageTheme === mode}
              disabled={!data.enable}
              on:change={() => setTheme(mode)}
            />
            {localize(mode)}
          </label>
        {/each}
      </div>
    </div>

    <div class="form-item">
      <div class="label-item">{localize('label_language')}:</div>
      <select class="select" bind:value={data.language}>
        {#each i18n.locales as locale (locale)}
          <option value={locale}>{localize(locale)}</option>
        {/each}
      </select>
    </div>

    <div class="form-item">
      <button class="advanced" on:click={openOptions}>
        {localize('label_advanced')} →
      </button>
      <button class="tour-link" on:click={replayTour}>
        {localize('tour_replay')}
      </button>
    </div>
  </div>
</main>

<style>
  main {
    overflow: auto;
    box-sizing: border-box;
    width: 330px;
    max-height: 599px;
    padding: 22px 24px 10px;
    border: 1px solid #24315870;
    border-radius: 1px;
  }
  .form-item {
    margin-bottom: 6px;
  }
  .form-item.inline {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
  }
  .tour-link {
    display: block;
    width: 100%;
    margin-top: 6px;
    padding: 4px;
    border: none;
    font-size: 12px;
    color: #607cd2;
    background: none;
    cursor: pointer;
  }
  .tour-link:hover {
    text-decoration: underline;
  }
  .plugins-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .all-btns button {
    margin-left: 4px;
    padding: 2px 8px;
    border: 1px solid #607cd2;
    border-radius: 10px;
    font-size: 11px;
    color: #607cd2;
    background: #fff;
    cursor: pointer;
  }
  .all-btns button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .advanced {
    width: 100%;
    margin-top: 8px;
    padding: 8px;
    border: 1px solid #607cd2;
    border-radius: 6px;
    color: #607cd2;
    background: #fff;
    font-weight: bold;
    cursor: pointer;
  }
  .advanced:hover {
    background: rgba(96, 124, 210, 0.1);
  }
  /* plain controls, styled like the settings page (src/options/app.svelte) */
  .switch {
    position: relative;
    flex: none;
    width: 40px;
    height: 22px;
    padding: 0;
    border: none;
    border-radius: 11px;
    background: #e6e8ec;
    cursor: pointer;
    transition: background 0.2s;
  }
  .switch span {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s;
  }
  .switch.on {
    background: #607cd2;
  }
  .switch.on span {
    transform: translateX(18px);
  }
  .switch:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 8px 0 12px;
  }
  .chip {
    padding: 5px 12px;
    border: none;
    border-radius: 16px;
    font-size: 13px;
    color: #243158;
    background: #e6e8ec;
    opacity: 0.54;
    cursor: pointer;
  }
  .chip.selected {
    color: #fff;
    background: #607cd2;
    opacity: 1;
  }
  .chip:disabled {
    cursor: default;
  }
  .chip:disabled.selected {
    color: #243158;
    background: #e6e8ec;
    opacity: 0.54;
  }
  .radios {
    display: flex;
    gap: 16px;
    margin: 8px 0 12px;
  }
  .radio {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: #243158e3;
    cursor: pointer;
  }
  .radio input {
    margin: 0;
    accent-color: #607cd2;
  }
  .select {
    width: 100%;
    margin: 8px 0 12px;
    padding: 6px 8px;
    border: 1px solid #c9cfdb;
    border-radius: 6px;
    font-size: 13px;
    color: #243158;
    background: #fff;
  }
  .select:focus {
    outline: 2px solid #607cd2;
    outline-offset: -1px;
  }
  .label-item {
    font-weight: bolder;
    font-size: 13px;
    color: #243158e3;
  }
</style>
