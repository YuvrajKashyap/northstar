import type { MemoryGraph } from '@calmvest/shared'
import { UserCircle } from '@phosphor-icons/react'

export function MiniGraph({ graph }: { graph: MemoryGraph | null }) {
  const nodes = graph?.nodes.slice(1, 7) ?? []
  return (
    <div className="mini-graph">
      <div className="center-node"><UserCircle size={24} /> Maya Patel</div>
      {nodes.map((node, index) => (
        <div className={`orbit-card orbit-${index}`} key={node.id}>
          <strong>{node.label}</strong>
          <span>{node.value}</span>
        </div>
      ))}
    </div>
  )
}

export function MemoryGalaxy({
  graph,
  selectedNodeId,
  setSelectedNodeId,
}: {
  graph: MemoryGraph | null
  selectedNodeId: string
  setSelectedNodeId: (id: string) => void
}) {
  const nodes = graph?.nodes ?? []
  return (
    <div className="memory-galaxy">
      <div className="graph-ring ring-one" />
      <div className="graph-ring ring-two" />
      {nodes.map((node, index) => (
        <button
          key={node.id}
          type="button"
          className={`graph-node node-${index} ${selectedNodeId === node.id ? 'active' : ''}`}
          onClick={() => setSelectedNodeId(node.id)}
        >
          <strong>{node.label}</strong>
          <span>{node.value}</span>
        </button>
      ))}
    </div>
  )
}
