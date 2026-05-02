import { CheckCircle, DotsThree, Flag, Pulse, ShieldCheck, Sparkle, Wallet } from '@phosphor-icons/react'
import { IconTile } from '../../components/product/IconTile'
import { PageHeader } from '../../components/product/PageHeader'
import type { ProductScreenProps } from '../../types/product'

export function ProfileScreen({ busy, plaid, simulatePlaid, runScenario, trace }: ProductScreenProps) {
  return (
    <>
      <PageHeader
        title="Agent workspace"
        subtitle="Connect accounts, run scenarios, and inspect what every agent used."
      >
        <button className="secondary-action" type="button" disabled={busy} onClick={runScenario}>
          <Sparkle size={18} /> Run scenario
        </button>
      </PageHeader>
      <section className="profile-layout">
        <div className="connect-panel">
          <div className="connect-steps">
            <span className="active">1</span>
            <em />
            <span className={plaid ? 'active' : ''}>2</span>
            <em />
            <span>3</span>
          </div>
          <div className="secure-orb">
            <div className="orb-ring">
              <ShieldCheck size={40} />
            </div>
            <h2>Simulated Plaid import</h2>
            <p>Pull demo accounts, holdings, tax lots, and transactions into the agent memory graph.</p>
          </div>
          <div className="institution-grid">
            {['Fidelity', 'Schwab', 'Vanguard'].map((name, index) => (
              <button className={index === 0 ? 'active' : ''} type="button" key={name}>
                {name}
              </button>
            ))}
          </div>
          <button className="primary-action full-button" type="button" disabled={busy} onClick={simulatePlaid}>
            Import demo accounts
          </button>
          {plaid ? (
            <p className="demo-note">
              <CheckCircle size={18} /> Imported {plaid.imported.accounts} accounts and {plaid.imported.holdings}{' '}
              holdings.
            </p>
          ) : null}
        </div>
        <aside className="import-panel">
          <div className="profile-card-main">
            <div className="avatar" />
            <div>
              <h3>Maya Patel</h3>
              <p>Primary Profile - Last updated 2h ago</p>
            </div>
          </div>
          <div className="metric-list">
            {[
              ['Portfolio value', '$184,250', Wallet],
              ['Tax lots', plaid ? String(plaid.imported.taxLots) : 'Ready', Flag],
              ['Recent agent trace', trace[0]?.agent ?? 'Scenario Agent', Pulse],
            ].map(([label, value, Icon]) => (
              <div className="metric-row" key={label as string}>
                <IconTile>
                  <Icon size={21} />
                </IconTile>
                <div>
                  <strong>{value as string}</strong>
                  <span>{label as string}</span>
                </div>
                <DotsThree size={18} />
              </div>
            ))}
          </div>
        </aside>
      </section>
    </>
  )
}
