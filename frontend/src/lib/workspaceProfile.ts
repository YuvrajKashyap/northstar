import type { MemoryGraph } from '@calmvest/shared'

const INVESTOR_LABEL: Record<string, string> = {
  beginner: 'Beginner investor',
  intermediate: 'Intermediate investor',
  advanced: 'Advanced investor',
}

export function workspaceProfileFromGraph(graph: MemoryGraph | null): { name: string; role: string } {
  const user = graph?.contextPacket?.user
  const sessionName = localStorage.getItem('northstar.activeUserName')?.trim()
  const name = user?.name?.trim() || sessionName || 'Northstar user'
  const raw = (user?.investor_level ?? 'beginner').toLowerCase().replace(/\s+/g, '_')
  if (raw === 'unknown') return { name, role: 'Member' }
  const role = INVESTOR_LABEL[raw] ?? `${raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} investor`
  return { name, role }
}
