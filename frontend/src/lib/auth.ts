const accessTokenKey = 'northstar.accessToken'

export function sessionHeaders(input?: HeadersInit) {
  const headers = new Headers(input)
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const accessToken = localStorage.getItem(accessTokenKey)?.trim()
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  return headers
}
