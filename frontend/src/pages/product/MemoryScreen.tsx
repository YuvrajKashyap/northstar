import { useEffect, useState } from 'react'
import { Copy, PencilSimple, UserCircle } from '@phosphor-icons/react'
import { EmptyCard, MemoryDetailCard, TraceEvent } from '../../components/product/cards'
import { IconTile } from '../../components/product/IconTile'
import { MemoryKindIcon } from '../../components/product/MemoryKindIcon'
import { PageHeader } from '../../components/product/PageHeader'
import type { ProductScreenProps } from '../../types/product'

export function MemoryScreen({ graph, memoryMarkdown, memoryDiff, trace }: ProductScreenProps) {
  const nodes = graph?.nodes ?? []
  const [selectedId, setSelectedId] = useState(nodes[0]?.id ?? 'goals')
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0]

  useEffect(() => {
    if (!selected && nodes[0]) setSelectedId(nodes[0].id)
  }, [nodes, selected])

  return (
    <>
      <PageHeader
        title="Memory center"
        subtitle="A readable profile plus the source-aware fields agents can call."
      />
      <section className="memory-layout">
        <aside>
          <div className="profile-heading">
            <UserCircle size={34} />
            <div>
              <h2>Maya</h2>
              <span className="verified">Verified</span>
            </div>
          </div>
          <div className="memory-tabs">
            <button className="active" type="button">Profile</button>
            <button type="button">Sources</button>
          </div>
          <div className="memory-section-list">
            {nodes.map((node) => (
              <button
                className={node.id === selectedId ? 'active' : ''}
                type="button"
                key={node.id}
                onClick={() => setSelectedId(node.id)}
              >
                <MemoryKindIcon kind={node.kind} />
                <span>{node.label}</span>
                <span className="count-pill">{node.usedBy.length}</span>
              </button>
            ))}
          </div>
        </aside>
        <div className="memory-detail-stack">
          {selected ? (
            <MemoryDetailCard node={selected} />
          ) : (
            <EmptyCard title="No memory yet" text="Commit onboarding to generate memory nodes." />
          )}
          <div className="markdown-card">
            <header>
              <h3>Memory document</h3>
              <button className="icon-button" type="button" aria-label="Copy memory">
                <Copy size={18} />
              </button>
            </header>
            <pre>{memoryMarkdown || 'No memory document loaded yet.'}</pre>
          </div>
        </div>
        <aside className="memory-right">
          <div className="agent-usage-panel">
            <div className="usage-heading">
              <h3>Recent diffs</h3>
              <span className="status-pill">Saved</span>
            </div>
            {(memoryDiff.length
              ? memoryDiff
              : [{ kind: 'set' as const, label: 'Communication', value: 'Plain English with clear next steps' }]
            ).map((item) => (
              <div className="usage-card" key={`${item.label}-${item.value}`}>
                <header>
                  <IconTile>
                    <PencilSimple size={19} />
                  </IconTile>
                  <div>
                    <h4>{item.label}</h4>
                    <p>{item.value}</p>
                  </div>
                  <span className="count-pill">{item.kind}</span>
                </header>
              </div>
            ))}
          </div>
          <div className="memory-controls">
            <h3>Agent trace</h3>
            {trace.slice(0, 4).map((event) => (
              <TraceEvent event={event} key={event.id} />
            ))}
          </div>
        </aside>
      </section>
    </>
  )
}
