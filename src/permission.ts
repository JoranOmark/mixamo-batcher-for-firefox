// Firefox exposes optional permissions to this top-level extension page.
const host = decodeURIComponent(location.hash.slice(1))
const allow = document.querySelector<HTMLButtonElement>('#allow')!
document.querySelector('#host')!.textContent = host
allow.disabled = !host || !/^[a-z0-9.\-:\[\]]+$/i.test(host)
document.querySelector('#cancel')!.addEventListener('click', () => window.close())
allow.addEventListener('click', () => {
  allow.disabled = true
  chrome.permissions.request({ origins: ['https://' + host + '/*'] }, () => {
    const error = chrome.runtime.lastError
    if (error) {
      document.querySelector('#error')!.textContent = error.message || 'Could not request host access.'
      allow.disabled = false
    } else window.close()
  })
})
