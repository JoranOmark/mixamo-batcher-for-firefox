<script lang="ts">
  import { onDestroy } from 'svelte'
  import { derived } from 'svelte/store'
  import { Pack, Product, Project } from '../../types'
  import { active, selectedCharacter, selectedProduct } from '../app'
  import Breadcrumbs from '../components/Breadcrumbs.svelte'
  import Button from '../components/Button.svelte'
  import ClampedText from '../components/ClampedText.svelte'
  import ContentArea from '../components/ContentArea.svelte'
  import Heading from '../components/Heading.svelte'
  import Input from '../components/Input.svelte'
  import Italic from '../components/Italic.svelte'
  import List from '../components/List.svelte'
  import Main from '../components/Main.svelte'
  import Preferences from '../components/Preferences.svelte'
  import Section from '../components/Section.svelte'
  import Spinner from '../components/Spinner.svelte'
  import Sticky from '../components/Sticky.svelte'
  import Title from '../components/Title.svelte'
  import CaretIcon from '../icons/CaretIcon.svelte'
  import { viewProduct } from '../products'
  import {
    InterruptedPack,
    addProduct,
    downloading,
    downloadPack,
    downloadHostAccess,
    duplicatePack,
    removePack,
    removeProduct,
  } from '../projects'

  export let project: Project

  export let pack: Pack

  let showSettings: boolean = false

  let duplicatePackName: string = ''

  let duplicatePackWarning: boolean = false

  let duplicatePackRef: HTMLInputElement

  $: productExists = derived([selectedProduct], ([selectedProduct]) => {
    return Boolean(pack?.products.find((p) => p.id === selectedProduct?.id))
  })

  function onClickDuplicatePack() {
    duplicatePackWarning = duplicatePackName === ''

    if (duplicatePackWarning) {
      duplicatePackRef.focus()
    } else {
      duplicatePack(project, pack, duplicatePackName)
      showSettings = false
    }
  }

  function onClickToggleSettings() {
    showSettings = !showSettings
  }

  function onClickRemovePack() {
    const msg = `Are you sure you want to delete the pack "${pack.name}"?`

    if (confirm(msg)) {
      removePack(project, pack)
    }
  }

  function onClickSwitchCharacter() {
    if ($selectedCharacter) {
      const msg = `Are you sure you want to switch this pack to use the character "${$selectedCharacter.name}"?`

      if (pack && confirm(msg)) {
        pack.character = $selectedCharacter
      }
    }
  }

  function onClickAddProduct() {
    if (pack) {
      addProduct(pack)
    }
  }

  function onClickRemoveProduct(product: Product) {
    const msg = `Are you sure you want to delete the animation "${product.name}"?`

    if (confirm(msg)) {
      removeProduct(pack, product.id)
    }
  }

  function onClickProduct(product: Product) {
    active.update((s) => ({ ...s, productId: s.productId !== product.id ? product.id : null }))

    if ($active.productId) {
      selectedProduct.set(product)
      viewProduct(product)
    }
  }

  type HostPrompt = { host: string; allow: (() => void) | null; cancel: () => void }
  let hostPrompt: HostPrompt | null = null
  let closed = false

  onDestroy(() => {
    closed = true
    hostPrompt?.cancel()
  })

  function askForHost(host: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cancel = () => {
        hostPrompt = null
        reject(new Error(`Access to ${host} was not granted. You can retry Download Pack.`))
      }
      if (closed) return cancel()
      showSettings = false
      hostPrompt = {
        host,
        cancel,
        allow() {
          downloadHostAccess(host, true).then((allowed) => {
            hostPrompt = null
            if (allowed) resolve()
            else cancel()
          }, (error) => { hostPrompt = null; reject(error) })
          hostPrompt = { host, cancel, allow: null }
        },
      }
    })
  }

  let partial: InterruptedPack | null = null
  let savingPartial = false
  let downloadError = ''
  async function savePartial() {
    if (!partial || savingPartial) return
    savingPartial = true
    try {
      await partial.save()
      partial = null
    } catch {
      downloadError = 'Firefox could not prepare the partial ZIP. Try saving it again.'
    } finally {
      savingPartial = false
    }
  }
  async function onClickDownloadPack() {
    partial = null
    downloadError = ''
    try {
      await downloadPack(project, pack, askForHost)
    } catch (error) {
      if (error instanceof InterruptedPack) partial = error
      downloadError = error instanceof Error ? error.message : 'Download failed. Please try again.'
    }
  }
</script>

<Main>
  <Sticky>
    <Section>
      <Title />
    </Section>
    <Section>
      <Breadcrumbs />
    </Section>
    <Section>
      <Button block disabled={Boolean(hostPrompt)} on:click={onClickToggleSettings}>
        {showSettings ? 'Hide' : 'Show'} Pack Settings
      </Button>
    </Section>
    {#if showSettings}
      <Section>
        <Heading>Pack Name</Heading>
        <Input bind:value={pack.name} />
      </Section>
      <Section>
        <Heading>Duplicate Pack</Heading>
        <Input
          bind:ref={duplicatePackRef}
          bind:value={duplicatePackName}
          warning={duplicatePackWarning}
          placeholder="Duplicated Pack Name"
        />
        <Button block on:click={onClickDuplicatePack}>Duplicate Pack</Button>
      </Section>
      <Section>
        <Heading>Selected Character</Heading>
        <div class="center-pad">
          <ClampedText clamp={1} text={pack?.character.name} />
        </div>
        <Button block on:click={onClickSwitchCharacter}>Switch to Displayed</Button>
      </Section>
      <Section>
        <Button block warning on:click={onClickRemovePack}>Delete Pack</Button>
      </Section>
    {:else}
      <Section>
        <Button
          block
          disabled={savingPartial || $downloading.total > 0 || !pack.products.length}
          title={$downloading.total > 0 ? 'Download in progress' : ''}
          on:click={onClickDownloadPack}
        >
          {#if $downloading.total > 0}
            {#if $downloading.zip > 0}
              Preparing Zip ({$downloading.zip}%)
            {:else}
              {$downloading.complete} / {$downloading.total} files ready
            {/if}
          {:else}
            Download Pack
          {/if}
        </Button>
        {#if $downloading.total > 0}
          <div class="download-status" role="status">{$downloading.stage}</div>
          {#if hostPrompt}
            <p class="download-status">Mixamo sent a file link on <strong>{hostPrompt.host}</strong>.</p>
            {#if hostPrompt.allow}
              <Button block on:click={hostPrompt.allow}>Review download permission</Button>
              <Button block on:click={hostPrompt.cancel}>Cancel download</Button>
            {:else}
              <p>Finish the permission request in the tab that opened.</p>
            {/if}
          {/if}
        {:else if downloadError}
          <div class="download-status" role="alert">{downloadError}</div>
          {#if partial}
            <Button block disabled={savingPartial} on:click={savePartial}>
              {savingPartial ? 'Preparing partial ZIP...' : `Save partial ZIP (${partial.count} ${partial.count === 1 ? 'file' : 'files'})`}
            </Button>
          {/if}
        {/if}
      </Section>
      <Section>
        <Heading>Add Animations</Heading>
        {#if $selectedProduct}
          <div class="center-pad">
            <div>{$selectedProduct.name}</div>
          </div>
          <Button
            block
            disabled={$productExists}
            title={$productExists ? 'Animation already exists in this pack' : ''}
            on:click={onClickAddProduct}
          >
            Add To Pack
          </Button>
        {:else}
          <div class="center-pad">
            <Italic>No animation currently selected</Italic>
          </div>
        {/if}
      </Section>
    {/if}
  </Sticky>

  {#if !showSettings}
    <ContentArea>
      <Section>
        <Heading>Pack Animations</Heading>
      </Section>
      <List>
        {#if pack}
          {#each pack.products as product}
            <li class="prod" class:expanded={product.id === $active.productId}>
              <div class="prod-header" on:click={() => onClickProduct(product)}>
                <div>
                  <div title={product.name}>{product.name}</div>
                  <Italic>
                    <ClampedText text={product.description} />
                  </Italic>
                </div>
                <div class="arrow">
                  <CaretIcon />
                </div>
              </div>
              {#if product.id === $active.productId}
                <div class="prod-body">
                  <label>
                    <input type="checkbox" bind:checked={product.projectOverride} />
                    Override Project Preferences
                  </label>
                  {#if product.projectOverride}
                    <div class="animation-settings">
                      <Heading>Download Preferences</Heading>
                      {#if product.details.supports_inplace}
                        <label>
                          <input type="checkbox"
                            checked={product.inplaceOverride ?? product.details.gms_hash.inplace}
                            on:change={(event) => product.inplaceOverride = event.currentTarget.checked} />
                          In Place
                        </label>
                      {/if}
                      <Preferences bind:preferences={product.preferences} />
                    </div>
                  {/if}
                  <Button block on:click={() => onClickRemoveProduct(product)}>Remove</Button>
                  <pre style="display:none">
                    <code>{JSON.stringify(product.details.gms_hash, null, 2)}</code>
                  </pre>
                </div>
              {/if}
            </li>
          {/each}
        {/if}
      </List>
    </ContentArea>
  {/if}
</Main>

<style>
  .download-status {
    padding-top: 6px;
    overflow-wrap: anywhere;
  }

  .center-pad {
    padding: 10px 10px 0 10px;
    text-align: center;
  }

  .prod {
    flex-direction: column;
    padding: 10px;
  }

  .prod.expanded .arrow {
    transform: rotate(180deg);
  }

  .arrow {
    margin-left: 10px;
    transform: rotate(90deg);
    transition: 0.2s;
  }

  .prod-header {
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    justify-content: space-between;
    width: 100%;
  }

  .prod-body {
    cursor: default;
    padding: 10px 0;
    width: 100%;
  }

  .animation-settings {
    margin: 0 0 10px 0;
    padding: 5px 0;
  }
</style>
