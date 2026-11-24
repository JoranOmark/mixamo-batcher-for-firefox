import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { nanoid } from 'nanoid'
import qs from 'qs'
import { get, writable } from 'svelte/store'
import { MessageType, ExportProductRequest, ExportProductResponse, Pack, Product, Project } from '../types'
import { active, fetchHeaders, fetchPrimary, selectedCharacter, selectedProduct } from './app'
import { defaultPack, defaultPreferences, defaultProject } from './constants'
import { viewProduct } from './products'
import { createStore } from './store'
import { getActiveTab } from './tabs'

export const projects = createStore<Project>('projects')

const idleDownload = { total: 0, complete: 0, zip: 0, stage: '' }
export const downloading = writable(idleDownload)

export function createProject(name: string) {
  const project: Project = defaultProject(name)

  projects.set(project)

  active.update((s) => ({ ...s, projectId: project.id }))
}

export function removeProject(project: Project) {
  active.update((s) => ({ ...s, projectId: null, editProject: false }))

  projects.remove(project)
}

export async function createPack(project: Project, name: string) {
  const character = await fetchPrimary()
  if (get(active).projectId !== project.id || !projects.get(project.id)) {
    return
  }

  const pack = defaultPack(name, character)
  await projects.save({ ...project, packs: { ...project.packs, [pack.id]: pack } })
  if (get(active).projectId !== project.id) return pack
  active.update((s) => ({ ...s, packId: pack.id, productId: pack.products[0].id }))
  viewProduct(pack.products[0])
  return pack
}

export function duplicatePack(project: Project, pack: Pack, name: string) {
  const duplicated = {
    ...pack,
    id: nanoid(),
    name,
  }

  project.packs = { ...project.packs, [duplicated.id]: duplicated }

  active.update((s) => ({ ...s, packId: duplicated.id, productId: duplicated.products[0]?.id }))
}

export function removePack(project: Project, pack: Pack) {
  const { [pack.id]: _, ...packs } = project.packs

  project.packs = packs

  active.update((s) => ({ ...s, packId: null }))
}

export function selectPack(pack: Pack) {
  const headers = fetchHeaders()

  if (!headers) {
    return
  }

  fetch('https://www.mixamo.com/api/v1/characters/update_primary', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      primary_character_id: pack.character.id,
    }),
  })
    .then((response) => response.json())
    .then(() => {
      getActiveTab().then((tab) => {
        active.update((s) => ({ ...s, packId: pack.id }))

        if (tab.id) {
          chrome.tabs.reload(tab.id)
        }
      })
    })
}

export function switchCharacter(pack: Pack) {
  const character = get(selectedCharacter)

  if (character) {
    pack.character = character
  }

  return pack
}

export function addProduct(pack: Pack) {
  const product = get(selectedProduct)

  if (pack && product) {
    const p = {
      ...product,
      projectOverride: false,
      preferences: defaultPreferences(),
    }

    pack.products = [...pack.products, p]

    active.update((s) => ({ ...s, productId: p.id }))
  }

  return null
}

export function removeProduct(pack: Pack, productId: string) {
  if (pack) {
    pack.products = pack.products.filter((p) => p.id !== productId)

    active.update((s) => ({ ...s, productId: null }))
  }
}

export function setSearchQuery(tab: chrome.tabs.Tab, product: Product) {
  return new Promise<chrome.tabs.Tab>((resolve) => {
    const url = tab.url || ''
    const urlArr = url.split('?')
    const urlParams = qs.stringify({
      ...qs.parse(urlArr[1]),
      query: product.description,
    })
    const newUrl = `${urlArr[0]}?${urlParams}`

    if (tab.id) {
      chrome.tabs.update(tab.id, { url: newUrl }, () => {
        resolve(tab)
      })
    }
  })
}

async function checkedFetch(url: string, options: RequestInit) {
  const response = await fetch(url, options)
  if (!response.ok) {
    const hint = response.status === 401 ? ' Reload Mixamo to reconnect your session.' : ''
    throw new Error(`HTTP ${response.status}.${hint}`)
  }
  return response
}

async function monitorDownload(uuid: string, options: RequestInit): Promise<string> {
  const url = `https://www.mixamo.com/api/v1/characters/${encodeURIComponent(uuid)}/monitor`
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const response = await checkedFetch(url, options)
    const job: ExportProductResponse = await response.json()
    if (job.status === 'processing' || job.status === 'queued' || job.status === 'pending') continue
    if (job.status === 'completed' && typeof job.job_result === 'string' && job.job_result) {
      return job.job_result
    }
    if (job.status === 'completed') throw new Error('Mixamo returned no file link.')
    throw new Error(`Mixamo reported "${job.status || 'unknown'}".`)
  }
}

export function downloadHostAccess(host: string, review = false): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const type = review ? MessageType.ReviewDownloadHost : MessageType.CheckDownloadHost
    chrome.runtime.sendMessage({ type, payload: host }, (allowed) => {
      const error = chrome.runtime.lastError
      if (error) reject(new Error(error.message))
      else resolve(allowed === true)
    })
  })
}

export async function downloadPack(project: Project, pack: Pack, askForHost: (host: string) => Promise<void>) {
  if (get(downloading).total) return
  const headers = fetchHeaders()
  if (!headers) throw new Error('Reload Mixamo to reconnect your session.')
  if (!pack.products.length) throw new Error('Add an animation to the pack first.')

  const zip = new JSZip()
  let stage = ''
  function showStage(label: string) {
    stage = label
    downloading.update((state) => ({ ...state, stage }))
  }

  downloading.set({ ...idleDownload, total: pack.products.length })
  try {
    for (const product of pack.products) {
      showStage(`Requesting ${product.name}`)
      const preferences = product.projectOverride ? product.preferences : project.preferences
      const hash = product.details.gms_hash
      let inplace = hash.inplace
      if (product.details.supports_inplace) {
        if (product.projectOverride) inplace = product.inplaceOverride ?? hash.inplace
        else if (project.motionMode === 'inPlace') inplace = true
        else if (project.motionMode === 'original') inplace = false
      }
      const body: ExportProductRequest = {
        character_id: pack.character.id,
        product_name: product.name,
        preferences,
        gms_hash: [{ ...hash, inplace, params: hash.params.map((param) => param[1]).join(',') }],
        type: 'Motion',
      }

      const controller = new AbortController()
      const startTimeout = () => setTimeout(() => controller.abort(), 10 * 60 * 1000)
      let timeout = startTimeout()
      try {
        const options: RequestInit = { headers, credentials: 'include', signal: controller.signal }
        const response = await checkedFetch('https://www.mixamo.com/api/v1/animations/export', {
          ...options,
          method: 'POST',
          body: JSON.stringify(body),
        })
        const job: ExportProductResponse = await response.json()
        if (!job.uuid) throw new Error('Mixamo returned no export ID.')

        showStage(`Waiting for Mixamo to export ${product.name}`)
        const url = new URL(await monitorDownload(job.uuid, options))
        if (url.protocol !== 'https:' || url.username || url.password) {
          throw new Error('Mixamo returned an invalid download link.')
        }
        if (!(await downloadHostAccess(url.hostname))) {
          clearTimeout(timeout)
          showStage(`Waiting for permission to download ${product.name}`)
          await askForHost(url.hostname)
          timeout = startTimeout()
        }
        showStage(`Fetching ${product.name} from ${url.hostname}`)
        const file = await checkedFetch(url.href, { credentials: 'omit', signal: controller.signal })
        const blob = await file.blob()
        if (!blob.size) throw new Error('Mixamo returned an empty file.')
        const ext = preferences.format.includes('dae') ? '.dae' : '.fbx'
        let filename = product.name + ext
        for (let i = 2; zip.file(filename); i++) filename = `${product.name} (${i})${ext}`
        zip.file(filename, blob)
        downloading.update((state) => ({ ...state, complete: state.complete + 1 }))
      } catch (error) {
        if (controller.signal.aborted) throw new Error('Timed out after 10 minutes.')
        throw error
      } finally {
        clearTimeout(timeout)
      }
    }

    showStage('Preparing ZIP')
    const blob = await zip.generateAsync({ type: 'blob' }, ({ percent }) => {
      downloading.update((state) => ({ ...state, zip: Math.round(percent) }))
    })
    saveAs(blob, /\.zip$/i.test(pack.name) ? pack.name : `${pack.name}.zip`)
  } catch (error) {
    throw new Error(`${stage} failed. ${error instanceof Error ? error.message : 'Please try again.'}`)
  } finally {
    downloading.set(idleDownload)
  }
}
