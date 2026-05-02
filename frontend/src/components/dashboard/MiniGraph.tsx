import type { MemoryGraph } from '@calmvest/shared'
import { UserCircle } from '@phosphor-icons/react'

const fallbackNodes = [
  { id: 'goals',   label: 'Goals',            value: 'Retire by 60\nFinancial freedom' },
  { id: 'risk',    label: 'Risk Comfort',      value: 'Moderate\nHigh clarity' },
  { id: 'values',  label: 'Values',           value: 'Freedom & flexibility\nLifelong learning' },
  { id: 'tax',     label: 'Tax Profile',      value: 'Taxable brokerage\nMarginal bracket' },
  { id: 'comms',   label: 'Comm. Style',      value: 'Plain English\nClear & concise' },
  { id: 'cash',    label: 'Cash Flow',        value: '$2,150 available\nLiquidity 40%' },
]

function truncate(str: string, max = 52): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str
}

export function MiniGraph({ graph }: { graph: MemoryGraph | null }) {
  const raw = graph?.nodes.filter((n) => n.id !== 'maya').slice(0, 6) ?? []
  const nodes = raw.length > 0 ? raw : fallbackNodes

  return (
    <div className="mini-graph">
      <div className="orbit-line" />
      <div className="orbit-line two" />
      <div className="center-node">
        <UserCircle size={22} weight="duotone" />
        <strong>Maya Patel</strong>
        <span>Primary Profile</span>
      </div>
      {nodes.map((node, index) => (
        <div className={`orbit-card orbit-${index}`} key={node.id}>
          <h4>{node.label}</h4>
          <p>{truncate(node.value)}</p>
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
          <span>{truncate(node.value, 48)}</span>
        </button>
      ))}
    </div>
  )
}
