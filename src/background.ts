import { updateQueryParams } from './common'
import { Message, MessageType, panelPortName } from './types'

const panels = new Map<number, chrome.runtime.Port>()

chrome.runtime.onConnect.addListener((port) => {
  const tabId = port.sender?.tab?.id
  if (
    port.name !== panelPortName ||
    port.sender?.url !== chrome.runtime.getURL('index.html') ||
    tabId == null
  ) return

  panels.set(tabId, port)
  port.onDisconnect.addListener(() => {
    if (panels.get(tabId) === port) panels.delete(tabId)
  })
})

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  if (message.type === MessageType.CheckDownloadHost || message.type === MessageType.ReviewDownloadHost) {
    if (sender.url !== chrome.runtime.getURL('index.html') || sender.tab?.id == null) return
    const host = message.payload
    let url: URL
    try {
      url = new URL('https://' + host)
    } catch {
      sendResponse(false)
      return
    }
    if (url.hostname !== host || host.includes('*')) {
      sendResponse(false)
      return
    }
    const permission = { origins: [url.origin + '/*'] }
    const check = () => chrome.permissions.contains(permission, (granted) => {
      sendResponse(!chrome.runtime.lastError && granted)
    })
    if (message.type === MessageType.CheckDownloadHost) check()
    else {
      chrome.tabs.create({ url: chrome.runtime.getURL('permission.html') + '#' + encodeURIComponent(host) }, (tab) => {
        if (chrome.runtime.lastError || tab?.id == null) { sendResponse(false); return }
        const onClose = (id: number) => {
          if (id !== tab.id) return
          chrome.tabs.onRemoved.removeListener(onClose)
          check()
        }
        chrome.tabs.onRemoved.addListener(onClose)
      })
    }
    return true
  }
  if (message.type === MessageType.Init || message.type === MessageType.ViewProduct) {
    if (sender.url !== chrome.runtime.getURL('index.html') || sender.tab?.id == null) {
      return
    }

    const tab = sender.tab
    if (message.type === MessageType.ViewProduct) {
      chrome.tabs.sendMessage(sender.tab.id, message, { frameId: 0 }, (ready) => {
        if (!chrome.runtime.lastError && ready) {
          updateQueryParams(tab, message.payload.description)
        }
      })
      return
    }

    chrome.tabs.sendMessage(sender.tab.id, message, { frameId: 0 }, (token) => {
      if (chrome.runtime.lastError) {
        sendResponse({ connected: false })
      } else {
        sendResponse({ connected: true, token })
      }
    })
    return true
  }

  const isPanelUpdate = message.type === MessageType.ProductFetched ||
    message.type === MessageType.StreamFetched ||
    message.type === MessageType.PrimaryUpdated
  if (isPanelUpdate && sender.frameId === 0 && sender.tab?.id != null) {
    panels.get(sender.tab.id)?.postMessage(message)
  }

  if (message.type === MessageType.FetchNextPage && sender.tab) {
    updateQueryParams(sender.tab, message.payload, true)
  }
})
