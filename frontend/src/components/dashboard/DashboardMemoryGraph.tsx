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
import { useMemo, useState } from 'react'
import { WorkspaceModal } from '../layout/WorkspaceModal'

function formatNodeValue(value: string): string {
  if (!value.trim()) return ''
  const chunks = value
    .split(/\s*;\s*/)
    .map((s) => s.trim())
    .map((chunk) =>
      chunk.replace(/\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/gi, (word) => word.replace(/_/g, ' ')),
    )
    .filter(Boolean)
  if (chunks.length <= 1) {
    return value
      .trim()
      .replace(/\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/gi, (word) => word.replace(/_/g, ' '))
  }
  return chunks.join('\n\n')
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
  const displayName =
    personNode?.label ?? graph?.contextPacket?.user?.name ?? 'Kushagra Bharti'
  const contextSubtitle = personNode?.value
    ? personNode.value.replace(/_/g, ' ')
    : 'home context'

  const detailNode =
    nodes.find((n) => n.id === selectedNodeId && n.kind !== 'person') ??
    orbitNodes.find((n) => n.id === 'goals') ??
    orbitNodes[0] ??
    null

  const ringPositions = useMemo(() => {
    const c = orbitNodes.length
    if (!c) return []
    const radius =
      c >= 8 ? 45.5 : c >= 7 ? 43.8 : c >= 5 ? 39.5 : 36.2
    return orbitNodes.map((_, i) => {
      const angle = (i / c) * 2 * Math.PI - Math.PI / 2
      return {
        left: 50 + Math.cos(angle) * radius,
        top: 50 + Math.sin(angle) * radius,
      }
    })
  }, [orbitNodes])

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
                title={node.value}
                style={{
                  left: `${ringPositions[index]?.left ?? 50}%`,
                  top: `${ringPositions[index]?.top ?? 50}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span className="memory-node__icon-wrap" aria-hidden>
                  <NodeIcon kind={node.kind} />
                </span>
                <strong>{node.label}</strong>
                <span className="memory-node__preview">{node.value}</span>
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
        title={detailNode?.label ?? 'Memory'}
        onClose={() => setDetailOpen(false)}
      >
        {detailNode ? (
          <>
            <span className="dashboard-node-insight__eyebrow">Context</span>
            <p className="dashboard-node-insight__body workspace-modal__detail-body">
              {formatNodeValue(detailNode.value)}
            </p>
            <p className="dashboard-node-insight__meta">
              <span>Source</span> {detailNode.source}
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
