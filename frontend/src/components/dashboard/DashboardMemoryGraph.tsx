import type { MemoryGraph, MemoryGraphNode } from '@calmvest/shared'
import {
  FlowArrow,
  Graph,
  HouseLine,
  Lock,
  Pulse,
  ShieldCheck,
  Target,
  TrendUp,
  UserCircle,
  Wallet,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { WorkspaceModal } from '../layout/WorkspaceModal'

function formatNodeValue(value: string): string {
  if (!value.trim()) return ''
  const normalized = cleanGraphText(value)
  const chunks = normalized
    .split(/\s*;\s*|\n+/)
    .map((s) => s.trim())
    .map(formatGraphChunk)
    .filter(Boolean)
  if (chunks.length <= 1) {
    return chunks[0] ?? ''
  }
  return chunks.join('\n\n')
}

function formatNodePreview(node: MemoryGraphNode) {
  const detail = formatNodeValue(node.value)
  if (node.kind === 'goal') {
    const goals = detail
      .split(/\n\n+/)
      .map((item) => item.trim())
      .filter(Boolean)
    if (goals.length > 1) {
      const firstGoal = goals[0]?.split('\n')[0] ?? 'Goals mapped'
      return `${firstGoal} + ${goals.length - 1} more`
    }
  }

  return detail
    .replace(/\n+/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanGraphText(value: string) {
  return value
    .trim()
    .replace(/\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/gi, (word) => word.replace(/_/g, ' '))
    .replace(/\$0(?:\.00)?\s+by\s+unknown/gi, 'target amount and timeline TBD')
    .replace(/\$0(?:\.00)?/gi, 'target amount TBD')
    .replace(/\bby\s+unknown\b/gi, 'timeline TBD')
    .replace(/\bunknown\b/gi, 'not filled in yet')
    .replace(/\b0,\s*not filled in yet\b/gi, 'Your active memory profile')
    .replace(/\bplain english\b/gi, 'Plain English')
    .replace(/\bmoderate cautious\b/gi, 'moderate and cautious')
}

function formatGraphChunk(chunk: string) {
  const goalMatch = chunk.match(/^([^:]+):\s*(.+)$/)
  if (!goalMatch) return sentenceCase(chunk)
  const [, label, detail] = goalMatch
  const cleanedDetail = detail
    .replace(/,\s*timeline TBD/gi, ' - Timeline TBD')
    .replace(/target amount and timeline TBD/gi, 'Target amount and timeline TBD')
    .replace(/target amount TBD/gi, 'Target amount TBD')
  return `${sentenceCase(label)}\n${sentenceCase(cleanedDetail)}`
}

function sentenceCase(value: string) {
  const text = value.trim()
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function formatNodeLabel(label: string) {
  return label
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bAnd\b/g, 'and')
}

function getSessionName() {
  return localStorage.getItem('northstar.activeUserName')?.trim() ?? ''
}

function isDemoPersonName(name: string) {
  return /^maya(?:\s+patel)?$/i.test(name.trim())
}

function resolveDisplayName(personLabel?: string, graphName?: string) {
  const sessionName = getSessionName()
  const candidates = [personLabel, graphName, sessionName, 'Northstar user']
    .map((name) => name?.trim() ?? '')
    .filter(Boolean)
  const chosen = candidates.find((name) => !(sessionName && isDemoPersonName(name))) ?? candidates[0]
  return chosen || 'Northstar user'
}

function formatPersonSubtitle(value: string | undefined) {
  const clean = formatNodeValue(value ?? '')
  if (!clean || clean === '0, unknown') return 'Your active memory profile'
  return clean
    .replace(/^0,\s*/i, '')
    .replace(/\bunknown\b/gi, 'profile in progress')
}

export function DashboardMemoryGraph({
  graph,
  selectedNodeId,
  onSelect,
}: {
  graph: MemoryGraph | null
  selectedNodeId: string
  onSelect: (id: string) => void
}) {
  const [detailOpen, setDetailOpen] = useState(false)

  const nodes = graph?.nodes ?? []
  const personNode = nodes.find((n) => n.kind === 'person')
  const orbitNodes = nodes.filter((n) => n.kind !== 'person')
  const displayName = resolveDisplayName(personNode?.label, graph?.contextPacket?.user?.name)
  const contextSubtitle = formatPersonSubtitle(personNode?.value)

  const detailNode =
    nodes.find((n) => n.id === selectedNodeId && n.kind !== 'person') ??
    orbitNodes.find((n) => n.id === 'goals') ??
    orbitNodes[0] ??
    null

  const ringPositions = (() => {
    const c = orbitNodes.length
    if (!c) return []
    const radius =
      c >= 8 ? 39 : c >= 7 ? 38 : c >= 5 ? 36.5 : 34
    return orbitNodes.map((_, i) => {
      const angle = (i / c) * 2 * Math.PI - Math.PI / 2
      return {
        left: clampPercent(50 + Math.cos(angle) * radius),
        top: clampPercent(50 + Math.sin(angle) * radius),
      }
    })
  })()

  return (
    <section className="dashboard-graph-stage" aria-label="Live context map">
      <div className="dashboard-graph-stage__orbit">
        <div className="graph-orbit dashboard-graph-orbit" aria-label="Memory graph visualization">
          <div className="graph-orbit__inner">
            <div className="graph-orbit__canvas">
            <div className="maya-node">
              <UserCircle size={26} weight="duotone" />
              <strong>{displayName}</strong>
              <span>{contextSubtitle}</span>
            </div>
            {orbitNodes.map((node, index) => (
              <button
                className={`memory-node ${node.id === selectedNodeId ? 'active' : ''}`}
                type="button"
                key={node.id}
                onClick={() => {
                  onSelect(node.id)
                  setDetailOpen(true)
                }}
                title={formatNodeValue(node.value)}
                style={{
                  left: `${ringPositions[index]?.left ?? 50}%`,
                  top: `${ringPositions[index]?.top ?? 50}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span className="memory-node__icon-wrap" aria-hidden>
                  <NodeIcon kind={node.kind} />
                </span>
                <strong>{formatNodeLabel(node.label)}</strong>
                <span className="memory-node__preview">{formatNodePreview(node)}</span>
              </button>
            ))}
          </div>
          </div>
          {orbitNodes.length === 0 ? (
            <div className="dashboard-graph-empty">
              <Graph size={22} />
              <strong>No memory graph yet</strong>
              <span>Finish onboarding and link accounts to see your context orbit.</span>
            </div>
          ) : null}
        </div>
      </div>

      <WorkspaceModal
        open={detailOpen && detailNode !== null}
        title={detailNode ? formatNodeLabel(detailNode.label) : 'Memory'}
        onClose={() => setDetailOpen(false)}
      >
        {detailNode ? (
          <>
            <span className="dashboard-node-insight__eyebrow">{detailNode.source}</span>
            <p className="dashboard-node-insight__body workspace-modal__detail-body">
              {formatNodeValue(detailNode.value)}
            </p>
            <p className="dashboard-node-insight__meta">
              <span>Used by</span> {detailNode.usedBy.length} Northstar specialist{detailNode.usedBy.length === 1 ? '' : 's'}
            </p>
            <div className="dashboard-node-insight__agents">
              {detailNode.usedBy.map((agent) => (
                <span key={agent}>{agent}</span>
              ))}
            </div>
          </>
        ) : null}
      </WorkspaceModal>
    </section>
  )
}

function clampPercent(value: number) {
  return Math.min(87, Math.max(13, value))
}

function NodeIcon({ kind }: { kind: MemoryGraphNode['kind'] }) {
  const Icon =
    kind === 'goal'
      ? Target
      : kind === 'risk'
        ? Pulse
        : kind === 'account'
          ? Wallet
          : kind === 'tax'
            ? ShieldCheck
            : kind === 'cash_flow'
              ? TrendUp
              : kind === 'communication'
                ? FlowArrow
                : kind === 'values'
                  ? Lock
                  : kind === 'person'
                    ? HouseLine
                    : Graph

  return <Icon size={18} weight="regular" />
}
