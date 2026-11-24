import { Message, MessageType, Product } from './types'

let viewProduct: Product | null

/**
 * listen to events sent from extension
 */
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === MessageType.Init) {
    sendResponse(localStorage.getItem('access_token'))
  } else if (message.type === MessageType.ViewProduct) {
    viewProduct = message.payload
    window.dispatchEvent(new CustomEvent('mbu_ViewProduct', { detail: JSON.stringify(viewProduct) }))
    sendResponse(true)
  }
})

/**
 * listen to custom events dispatched from xhr injection
 */
window.addEventListener('mbu_Message', function (e: CustomEvent<string>) {
  // A string crosses Firefox's page/content-script boundary without an object wrapper.
  if (typeof e.detail !== 'string') return
  let message: Message
  try {
    message = JSON.parse(e.detail)
  } catch {
    return
  }
  if (!message) return
  if (
    message.type === MessageType.ProductFetched ||
    message.type === MessageType.PrimaryUpdated ||
    message.type === MessageType.StreamFetched
  ) {
    chrome.runtime.sendMessage(message)
  }

  if (message.type === MessageType.ProductsFetched && viewProduct && Array.isArray(message.payload)) {
    const index = message.payload.indexOf(viewProduct.id)

    if (index >= 0) {
      setTimeout(() => clickOnViewProduct(index), 500)
    } else {
      // TODO handle item not being on first page of page results
      // chrome.runtime.sendMessage({
      //   type: MessageType.FetchNextPage,
      //   payload: viewProduct.description,
      // })
    }
  }
} as EventListener)

/**
 * We store the page results and click on the tile which corresponds to the current `viewProduct`
 */
function clickOnViewProduct(index: number) {
  if (index >= 0) {
    const el = document.querySelectorAll('.product li')[index]
    el?.dispatchEvent(new Event('click', { bubbles: true }))
  }
}

function createIframe() {
  const iframe = document.createElement('iframe')
  iframe.id = 'mixamo-batch'
  iframe.src = chrome.runtime.getURL('index.html')
  iframe.style.setProperty('border', '0')
  iframe.style.setProperty('bottom', '0')
  iframe.style.setProperty('position', 'absolute')
  iframe.style.setProperty('right', '0')
  iframe.style.setProperty('width', '16.666666%')
  iframe.style.setProperty('z-index', '1000')

  function setIframeHeight() {
    const node = document.querySelector('.sidebar-list > *')
    if (node) {
      const rect = node.getBoundingClientRect()

      iframe.style.setProperty('height', `calc(100% - ${rect.bottom + 10}px)`)
      iframe.style.setProperty('display', 'block')
    } else {
      iframe.style.setProperty('display', 'none')
    }
  }

  let observed: Element | null = null
  const resize = new ResizeObserver(setIframeHeight)
  function observeSidebar() {
    const sidebar = document.querySelector('.sidebar-list > *')
    if (sidebar === observed) return
    resize.disconnect()
    observed = sidebar
    if (sidebar) resize.observe(sidebar)
    setIframeHeight()
  }
  new MutationObserver(observeSidebar).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
  window.addEventListener('resize', setIframeHeight)
  setIframeHeight()
  observeSidebar()

  document.body.appendChild(iframe)
}

createIframe()
