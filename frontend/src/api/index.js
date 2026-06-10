const BASE = '/api'

export async function login(baseUrl, username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseUrl, username, password })
  })
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`)
  return res.json()
}

export async function getFileTree(path) {
  const res = await fetch(`${BASE}/files/tree?path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error(`Failed to load tree: ${res.status}`)
  return res.json()
}

export async function getFileContent(path) {
  const res = await fetch(`${BASE}/files/content?path=${encodeURIComponent(path)}`)
  if (!res.ok) throw new Error(`Failed to read file: ${res.status}`)
  return res.json()
}

export async function saveFileContent(path, content) {
  const res = await fetch(`${BASE}/files/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content })
  })
  if (!res.ok) throw new Error(`Failed to save file: ${res.status}`)
  return res.json()
}

export function streamChat({ token, baseUrl, chatPath, model, messages, onChunk, onDone, onError }) {
  const controller = new AbortController()

  fetch(`${BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, baseUrl, chatPath, model, messages }),
    signal: controller.signal
  }).then(async res => {
    if (!res.ok) {
      const text = await res.text()
      onError(new Error(`Stream failed: ${res.status} - ${text}`))
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        // SSE format: "data: ..."
        const dataMatch = line.match(/^data:\s?(.+)$/)
        if (!dataMatch) continue
        const raw = dataMatch[1].trim()
        if (raw === '[DONE]') { onDone(); return }
        try {
          const json = JSON.parse(raw)
          const delta = json?.choices?.[0]?.delta?.content
          if (delta) onChunk(delta)
        } catch {
          // skip non-JSON lines
        }
      }
    }
    onDone()
  }).catch(err => {
    if (err.name !== 'AbortError') onError(err)
  })

  return () => controller.abort()
}
