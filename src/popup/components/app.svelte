<script lang="ts">
  import storage from '@/core/storage'
  import Warning from './warning.svelte'
  import Header from './header.svelte'
  import Radio from '@smui/radio'
  import Switch from '@smui/switch'
  import FormField from '@smui/form-field'
  import Select, { Option } from '@smui/select'
  import Chip, { Set, Text } from '@smui/chips'
  import MD_PLUGINS from '@/config/md-plugins'
  import PAGE_THEMES from '@/config/page-themes'
  import { getDefaultData, type Data } from '@/core/data'
  import pkg from '../../../package.json'
  import i18n from '@/config/i18n'

  let localize = i18n()
  let homepage = pkg.homepage
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

  function setAllPlugins(on: boolean) {
    if (!data.enable) return
    data.mdPlugins = on ? [...MD_PLUGINS] : []
    savePlugins()
  }

  function openOptions() {
    chrome.runtime.openOptionsPage()
  }

  function changeLocale(language) {
    localize = i18n(language)
  }
</script>

<main>
  <Header {homepage} />

  {#if !isAllowViewFile}
    <Warning {localize} />
  {/if}

  <div class="form" disabled={!data.enable}>
    <div class="form-item inline">
      <span class="label-item">{localize('label_enable')}:</span>
      <FormField align="end">
        <Switch
          bind:checked={data.enable}
          color="primary"
          on:change={() => updateConfig('enable', data.enable)}
        />
      </FormField>
    </div>

    <div class="form-item inline">
      <span class="label-item">{localize('label_centered')}:</span>
      <FormField align="end">
        <Switch
          disabled={!data.enable}
          bind:checked={data.centered}
          color="primary"
          on:change={() => updateConfig('centered', data.centered)}
        />
      </FormField>
    </div>

    <div class="form-item inline">
      <span class="label-item">{localize('label_auto-refresh')}:</span>
      <FormField align="end">
        <Switch
          disabled={!data.enable}
          bind:checked={data.refresh}
          color="primary"
          on:change={() => updateConfig('refresh', data.refresh)}
        />
      </FormField>
    </div>

    <div class="form-item inline">
      <span class="label-item">{localize('label_dir_view')}:</span>
      <FormField align="end">
        <Switch
          disabled={!data.enable}
          bind:checked={data.dirView}
          color="primary"
          on:change={() => updateConfig('dirView', data.dirView)}
        />
      </FormField>
    </div>

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
      <Set
        let:chip
        bind:selected={data.mdPlugins}
        chips={MD_PLUGINS}
        nonInteractive={!data.enable}
        filter={data.enable}
      >
        <Chip
          {chip}
          title={chip}
          on:click={() =>
            data.enable && savePlugins()}
          ><Text>{localize(chip)}</Text></Chip
        >
      </Set>
    </div>

    <div class="form-item">
      <div class="label-item">{localize('label_theme')}:</div>
      {#each PAGE_THEMES as mode}
        <FormField>
          <span slot="label"> {localize(mode)} </span>
          <Radio
            disabled={!data.enable}
            bind:group={data.pageTheme}
            bind:value={mode}
            on:change={() => updateConfig('pageTheme', mode)}
          />
        </FormField>
      {/each}
    </div>

    <div class="form-item">
      <div class="label-item">{localize('label_language')}:</div>
      <FormField style="padding-left: 10px">
        <Select bind:value={data.language}>
          {#each i18n.locales as locale}
            <Option value={locale}>{localize(locale)}</Option>
          {/each}
        </Select>
      </FormField>
    </div>

    <div class="form-item">
      <button class="advanced" on:click={openOptions}>
        {localize('label_advanced')} →
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
  .label-item {
    font-weight: bolder;
    font-size: 13px;
    color: #243158e3;
  }
</style>
