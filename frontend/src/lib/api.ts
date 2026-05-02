import type {
  AgentRunRequest,
  AgentTraceEvent,
  PlanApprovalResponse,
  PlanGenerateResponse,
  PlansResponse,
  RawMemoryDocument,
} from '@calmvest/shared'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

function apiUrl(path: string) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(apiUrl(path), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    })
    if (!response.ok) throw new Error(await response.text())
    return response.json() as Promise<T>
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Could not reach the Northstar API at ${API_BASE || 'the Vite /api proxy'}. Make sure the backend is running on port 8787.`, { cause: error })
    }
    throw error
  }
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  return apiJson<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export async function streamAgentRun(request: AgentRunRequest, onEvent: (event: AgentTraceEvent) => void) {
  const response = await fetch(apiUrl('/api/agent/run/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  await readSseTrace(response, onEvent)
}

export async function streamScenarioTrace(userId: string, onEvent: (event: AgentTraceEvent) => void) {
  const response = await fetch(apiUrl('/api/agent/scenario/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  await readSseTrace(response, onEvent)
}

export function getRawMemory(userId: string) {
  return apiJson<RawMemoryDocument>(`/api/memory/raw?userId=${encodeURIComponent(userId)}`)
}

export function getPlans(userId: string) {
  return apiJson<PlansResponse>(`/api/plans?userId=${encodeURIComponent(userId)}`)
}

export function generatePlan(userId: string) {
  return postJson<PlanGenerateResponse>('/api/plans/generate', { userId })
}

export function updatePlanStepApproval(planId: string, stepId: string, userId: string, approvalStatus: 'approved' | 'rejected') {
  return postJson<PlanApprovalResponse>(`/api/plans/${planId}/steps/${stepId}/approval`, { userId, approvalStatus })
}

async function readSseTrace(response: Response, onEvent: (event: AgentTraceEvent) => void) {
  if (!response.ok) throw new Error(await response.text())
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
