import { Message, MessageType, Product } from './types'

function parseJson(value: unknown) {
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

let savedProduct: Product | null = null
window.addEventListener('mbu_ViewProduct', (event) => {
  const product = parseJson((event as CustomEvent).detail)
  savedProduct = typeof product?.id === 'string' && product.details?.gms_hash ? product : null
})

function dispatchMessageEvent(message: Message) {
  window.dispatchEvent(new CustomEvent('mbu_Message', { detail: JSON.stringify(message) }))
}

const paths = new WeakMap<XMLHttpRequest, string>()
const observing = new WeakSet<XMLHttpRequest>()
function onResponse(this: XMLHttpRequest) {
  if (this.readyState !== 4 || this.status < 200 || this.status >= 300) return
  const path = paths.get(this)
  if (!path || (this.responseType && this.responseType !== 'text' && this.responseType !== 'json')) return
  const payload = this.responseType === 'json' ? this.response : parseJson(this.responseText)
  if (!payload) return
  if (path.startsWith('/api/v1/products/') && typeof payload.id === 'string' &&
      (payload.details?.gms_hash || payload.type === 'MotionPack')) {
    if (savedProduct?.id === payload.id && savedProduct?.details.gms_hash && payload.details?.gms_hash) {
      payload.details.gms_hash = savedProduct.details.gms_hash
      savedProduct = null
      const text = JSON.stringify(payload)
      Object.defineProperty(this, 'response', { configurable: true, value: this.responseType === 'json' ? payload : text })
      if (this.responseType !== 'json') Object.defineProperty(this, 'responseText', { configurable: true, value: text })
    }
    dispatchMessageEvent({ type: MessageType.ProductFetched, payload })
  } else if (path === '/api/v1/products' && Array.isArray(payload.results)) {
    dispatchMessageEvent({ type: MessageType.ProductsFetched, payload: payload.results.map((item: Product) => item.id) })
  } else if (path === '/api/v1/characters/update_primary') {
    dispatchMessageEvent({ type: MessageType.PrimaryUpdated, payload })
  }
}

const originalOpen = XMLHttpRequest.prototype.open
XMLHttpRequest.prototype.open = function (method: string, url: string | URL) {
  const address = new URL(url, document.baseURI)
  const mixamo = address.origin === location.origin || address.origin === 'https://www.mixamo.com' || address.origin === 'https://mixamo.com'
  const path = mixamo ? address.pathname : ''
  paths.set(this, path.startsWith('/api/v1/') ? path : '')
  if (!observing.has(this)) {
    this.addEventListener('readystatechange', onResponse)
    observing.add(this)
  } else {
    Reflect.deleteProperty(this, 'response')
    Reflect.deleteProperty(this, 'responseText')
  }
  return Reflect.apply(originalOpen, this, arguments)
}

const originalSend = XMLHttpRequest.prototype.send
XMLHttpRequest.prototype.send = function (data) {
  if (paths.get(this) === '/api/v1/animations/stream') {
    const payload = parseJson(data)
    if (Array.isArray(payload?.gms_hash)) dispatchMessageEvent({ type: MessageType.StreamFetched, payload })
  }
  return Reflect.apply(originalSend, this, arguments)
}
