import type { MemoryGraph } from '@calmvest/shared'

const INVESTOR_LABEL: Record<string, string> = {
  beginner: 'Beginner investor',
  intermediate: 'Intermediate investor',
  advanced: 'Advanced investor',
}

export function workspaceProfileFromGraph(graph: MemoryGraph | null): { name: string; role: string } {
  const user = graph?.contextPacket?.user
  const name = user?.name ?? 'Kushagra Bharti'
  const raw = (user?.investor_level ?? 'beginner').toLowerCase().replace(/\s+/g, '_')
  const role = INVESTOR_LABEL[raw] ?? `${raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} investor`
  return { name, role }
}
