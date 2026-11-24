import { updateQueryParams } from './common'
import { Message, MessageType } from './types'

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
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

  if (message.type === MessageType.FetchNextPage && sender.tab) {
    updateQueryParams(sender.tab, message.payload, true)
  }
})
