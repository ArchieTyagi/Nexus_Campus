const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // Keep the full reply on the error, for pages that need more than the message (like import problems)
    const error = new Error(data.message || 'Something went wrong')
    error.status = res.status
    error.data = data
    throw error
  }
  return data
}
