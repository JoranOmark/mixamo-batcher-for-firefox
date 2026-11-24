export function getActiveTab() {
  return new Promise<chrome.tabs.Tab>((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        resolve(tabs[0])
      } else {
        reject()
      }
    })
  })
}
