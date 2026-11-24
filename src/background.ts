import { updateQueryParams } from './common'
import { Message, MessageType } from './types'

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  if (message.type === MessageType.Init) {
    if (sender.url !== chrome.runtime.getURL('index.html') || sender.tab?.id == null) {
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

  if (message.type === MessageType.FetchNextPage) {
    updateQueryParams(message.payload, true)
  }
})
