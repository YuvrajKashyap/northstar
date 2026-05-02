import type { AgentTraceEvent } from '@calmvest/shared'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<T>
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  return apiJson<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export async function streamScenarioTrace(onEvent: (event: AgentTraceEvent) => void) {
  const response = await fetch(`${API_BASE}/api/agent/scenario/stream`, { method: 'POST' })
  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''
    for (const chunk of chunks) {
      const data = chunk.split('\n').find((line) => line.startsWith('data: '))?.slice(6)
      if (!data) continue
      const parsed = JSON.parse(data)
      if ('type' in parsed) onEvent(parsed as AgentTraceEvent)
    }
  }
}
