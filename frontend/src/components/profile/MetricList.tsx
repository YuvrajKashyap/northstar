import { Wallet } from '@phosphor-icons/react'

export function MetricList({ rows }: { rows: Array<[string, string, string]> }) {
  return (
    <div className="metric-list">
      {rows.map(([label, value, helper]) => (
        <div key={label}>
          <Wallet size={24} />
          <span><strong>{label}</strong><small>{helper}</small></span>
          <b>{value}</b>
        </div>
      ))}
    </div>
  )
}
