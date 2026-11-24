import qs from 'qs'

export function updateQueryParams(tab: chrome.tabs.Tab, query: string, nextPage = false) {
  if (tab.id == null || !tab.url) return
  const [base, search] = tab.url.split('?')
  const params = qs.parse(search || '')
  const newParams = qs.stringify({
    ...params,
    query,
    page: nextPage ? parseInt(String(params.page ?? '1'), 10) + 1 : 1,
  })
  chrome.tabs.update(tab.id, { url: `${base}?${newParams}` })
}
