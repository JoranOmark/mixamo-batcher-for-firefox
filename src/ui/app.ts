import { saveAs } from 'file-saver'
import localforage from 'localforage'
import { get, writable } from 'svelte/store'
import { Active, Character, ExportFile, Message, MessageType, Product, Project, panelPortName } from '../types'
import { products, syncStreamParamsToProduct } from './products'
import { projects } from './projects'

export const accessToken = writable<string | null>(null)
export const sessionStatus = writable('Checking Mixamo session…')

export const selectedCharacter = writable<Character | null>(null)

export const selectedProduct = writable<Product | null>(null)

export const active = writable<Active>({})

export const activePersistent = localforage.createInstance({ storeName: 'active' })

export function suffix(val: Array<any> | object | number) {
  return (Array.isArray(val)
    ? val.length
    : typeof val === 'object'
    ? Object.keys(val).length
    : val) === 1
    ? ''
    : 's'
}

export function fetchHeaders() {
  const token = get(accessToken)

  if (!token) {
    return null
  }

  return {
    'Content-Type': 'application/json',
    'X-Api-Key': 'mixamo2',
    Authorization: `Bearer ${token}`,
  }
}

const restored = Promise.all([
  projects.loading,
  products.loading,
  activePersistent.getItem<Active>('active'),
]).then(([, , savedSelection]) => {
  if (savedSelection) {
    active.set(savedSelection)
  }
  active.subscribe((val) => {
    activePersistent.setItem('active', val)
  })
})

export function initialize() {
  const panel = chrome.runtime.connect({ name: panelPortName })
  panel.onMessage.addListener((message: Message) => {
    // console.log({ ...message, type: MessageType[message.type].toString() })
    if (message.type === MessageType.ProductFetched) {
      selectedProduct.set(message.payload)
      products.set(message.payload)
    } else if (message.type === MessageType.StreamFetched) {
      const { projectId, packId } = get(active)
      const project = projectId && projects.get(projectId)
      const pack = project && packId && project.packs[packId]
      if (project && pack) syncStreamParamsToProduct(project, pack, message.payload)
    } else if (message.type === MessageType.PrimaryUpdated) {
      fetchPrimary().catch(() => selectedCharacter.set(null))
    }
  })

  chrome.runtime.sendMessage({ type: MessageType.Init }, async (response) => {
    if (chrome.runtime.lastError || !response?.connected) {
      sessionStatus.set('Could not connect to the Mixamo tab. Reload the page to try again.')
      return
    }

    try {
      await restored
    } catch {
      sessionStatus.set('Could not open saved projects. Reload the page to try again.')
      return
    }
    accessToken.set(response.token || null)
    sessionStatus.set('Not logged in')
  })
}

export async function importData(file?: File) {
  if (!file) return
  const data: ExportFile = JSON.parse(await file.text())
  const record = (value: unknown) => value !== null && typeof value === 'object' && !Array.isArray(value)
  if (data?.version !== 1 || !record(data.projects)) throw new Error('Invalid project backup')
  const entries = Object.entries(data.projects)
  for (const [id, project] of entries) {
    if (!project || project.id !== id || typeof project.name !== 'string' || !record(project.packs) || !record(project.preferences)) {
      throw new Error('Invalid project in backup')
    }
    for (const [packId, pack] of Object.entries(project.packs)) {
      if (!pack || pack.id !== packId || typeof pack.name !== 'string' || typeof pack.character?.id !== 'string' ||
        !Array.isArray(pack.products) || !pack.products.every(p => typeof p?.id === 'string' && typeof p.name === 'string' && Array.isArray(p.details?.gms_hash?.params))) {
        throw new Error('Invalid animation pack in backup')
      }
    }
  }
  for (const [, project] of entries) {
    if (!projects.get(project.id) || confirm(`Overwrite the project "${project.name}"?`)) await projects.save(project)
  }
}

export async function exportData(project?: Project) {
  const data = {
    version: 1,
    projects: project ? { [project.id]: project } : projects.all(),
  }

  saveAs(new Blob([JSON.stringify(data)]), 'mbu_projects.json')
}

export async function fetchPrimary(): Promise<Character> {
  const headers = fetchHeaders()

  if (!headers) {
    throw new Error('Reload Mixamo to reconnect your session.')
  }

  const response = await fetch('https://www.mixamo.com/api/v1/characters/primary', { headers })
  if (!response.ok) {
    throw new Error(`Mixamo could not load the current character (HTTP ${response.status}).`)
  }

  const { primary_character_id: id, primary_character_name: name } = await response.json()
  if (typeof id !== 'string' || !id || typeof name !== 'string' || !name) {
    throw new Error('Mixamo did not return a current character. Select a character and try again.')
  }
  const character = { id, name }
  selectedCharacter.set(character)
  return character
}
