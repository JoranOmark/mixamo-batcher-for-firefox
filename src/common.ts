export function updateQueryParams(tab: chrome.tabs.Tab, query: string, nextPage = false) {
  if (tab.id == null || !tab.url) return
  // Mixamo keeps the animation search query inside its hash route.
  const [base, search] = tab.url.split(/\?(.*)/s)
  const params = new URLSearchParams(search)
  const page = Number.parseInt(params.get('page') || '1', 10) || 1
  params.set('query', query)
  params.set('page', String(nextPage ? page + 1 : 1))
  chrome.tabs.update(tab.id, { url: `${base}?${params.toString().replace(/\+/g, '%20')}` })
}
