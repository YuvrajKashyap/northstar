import type { MemoryGraph } from '@calmvest/shared'
import { UserCircle } from '@phosphor-icons/react'

/** Static nodes for the hero preview — never use raw API strings here */
const heroNodes = [
  { id: 'goals',   label: 'Goals',          value: 'Home by 2027\nHigh clarity' },
  { id: 'risk',    label: 'Risk Comfort',   value: 'Moderate\nCalm under pressure' },
  { id: 'values',  label: 'Values',         value: 'Freedom & flexibility\nLifelong learning' },
  { id: 'tax',     label: 'Tax Profile',    value: 'Taxable brokerage\nTax-aware trades' },
  { id: 'comms',   label: 'Comm. Style',   value: 'Plain English\nClear next steps' },
  { id: 'cash',    label: 'Cash Flow',      value: '$2,150 available\n40% liquidity' },
]

function trunc(s: string, n = 46) {
  return s && s.length > n ? s.slice(0, n).trimEnd() + '…' : s
}

/** Hero orbit graph — always uses clean static data, ignores live API */
export function MiniGraph({ graph: _graph }: { graph: MemoryGraph | null }) {
  return (
    <div className="mini-graph">
      <div className="orbit-line" />
      <div className="orbit-line two" />
      <div className="center-node">
        <UserCircle size={22} weight="duotone" />
        <strong>Maya Patel</strong>
        <span>Primary Profile</span>
      </div>
      {heroNodes.map((n, i) => (
        <div className={`orbit-card orbit-${i}`} key={n.id}>
          <h4>{n.label}</h4>
          <p>{n.value}</p>
        </div>
      ))}
    </div>
  )
}

/** Full dashboard graph — uses live API data with safe truncation */
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
      {nodes.map((node, i) => (
        <button
          key={node.id}
          type="button"
          className={`graph-node node-${i} ${selectedNodeId === node.id ? 'active' : ''}`}
          onClick={() => setSelectedNodeId(node.id)}
        >
          <strong>{node.label}</strong>
          <span>{trunc(node.value, 48)}</span>
        </button>
      ))}
    </div>
  )
}
