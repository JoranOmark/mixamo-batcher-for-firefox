import { MessageType, Pack, Product, Project, Stream } from '../types'
import { projects } from './projects'
import { createStore } from './store'

export const products = createStore<Product>('products')

export function viewProduct(product: Product) {
  chrome.runtime.sendMessage({
    type: MessageType.ViewProduct,
    payload: product,
  })
}

export function syncStreamParamsToProduct(project: Project, pack: Pack, stream: Stream) {
  const gms = stream.gms_hash[0]

  if (pack && gms && stream.gms_hash.length === 1) {
    pack.products = pack.products.map((p) => {
      const hash = p.details?.gms_hash
      if (hash && hash['model-id'] === gms['model-id']) {
        hash['arm-space'] = gms['arm-space']
        hash.inplace = gms.inplace
        hash.trim = gms.trim

        gms.params
          .split(',')
          .map(parseFloat)
          .forEach((val, i) => {
            if (hash.params[i]) hash.params[i][1] = val
          })
      }

      return p
    })
  }

  projects.store.update((s) => s)
}
