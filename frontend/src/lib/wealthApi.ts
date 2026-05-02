import type {
  AgentTraceEvent,
  MemoryGraph,
  OnboardingAnswers,
  OnboardingCommitResult,
  PlaidLinkResult,
} from '@calmvest/shared'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function linkAccounts() {
  return requestJson<PlaidLinkResult>('/api/demo/simulate-plaid-link', { method: 'POST' })
}

export function commitOnboarding(answers: OnboardingAnswers) {
  return requestJson<OnboardingCommitResult>('/api/onboarding/commit', {
    method: 'POST',
    body: JSON.stringify(answers),
  })
}

export function getMemoryGraph(userId: string) {
  return requestJson<MemoryGraph>(`/api/memory/graph?userId=${encodeURIComponent(userId)}`)
}

export async function streamScenarioTrace(onEvent: (event: AgentTraceEvent) => void) {
  const response = await fetch(`${API_BASE}/api/agent/scenario/stream`, { method: 'POST' })
  if (!response.ok) {
    throw new Error(await response.text())
  }

  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const messages = buffer.split('\n\n')
    buffer = messages.pop() ?? ''

    for (const message of messages) {
      const data = message
        .split('\n')
        .find((line) => line.startsWith('data: '))
        ?.slice(6)

      if (!data) continue

      const parsed = JSON.parse(data) as Partial<AgentTraceEvent>
      if (parsed.type && parsed.agent && parsed.label) {
        onEvent(parsed as AgentTraceEvent)
      }
    }
  }
}
