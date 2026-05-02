import { Check, CheckCircle, Lock, ShieldCheck, Wallet } from '@phosphor-icons/react'
import type { ScreenProps } from '../types/screens'
import { AppChrome } from '../components/layout/AppChrome'
import { AppPageHeader } from '../components/layout/AppPageHeader'
import { MetricList } from '../components/profile/MetricList'
import { ProfileCard } from '../components/profile/ProfileCard'

export function ProfilePage(props: ScreenProps) {
  return (
    <AppChrome active="profile" setScreen={props.setScreen}>
      <section className="profile-screen screen-enter">
        <AppPageHeader title="Import & Connect Accounts" subtitle="Connect your financial accounts to build your personalized financial context." />
        <div className="profile-layout">
          <article className="connect-panel">
            <div className="connect-steps">
              {['Connect', 'Review', 'Confirm', 'Complete'].map((item, index) => (
                <span className={index === 0 ? 'active' : ''} key={item}>{index + 1} {item}</span>
              ))}
            </div>
            <div className="secure-orb"><ShieldCheck size={54} /></div>
            <h2>Secure Connection</h2>
            <p>Your data is encrypted and never stored outside the demo account model.</p>
            <div className="institution-grid">
              {['Greenfield Wealth', 'Pinecrest Advisors', 'Harbor Investments', 'Summit Financial', 'Evergreen Capital', 'Other Institution'].map((item, index) => (
                <button className={index === 0 ? 'selected' : ''} type="button" key={item}>{item}</button>
              ))}
            </div>
            <div className="account-type-list">
              {['Brokerage Account', 'Mutual Fund Account', 'Cash Account', 'Crypto Account'].map((item, index) => (
                <div key={item}>
                  <Wallet size={22} />
                  <span>{item}</span>
                  {index < 3 ? <Check size={20} /> : <span className="empty-check" />}
                </div>
              ))}
            </div>
            <button className="primary-action full" type="button" onClick={props.simulatePlaidLink} disabled={props.busyStep === 'plaid'}>
              <Lock size={18} /> {props.busyStep === 'plaid' ? 'Connecting...' : 'Connect Securely'}
            </button>
          </article>
          <aside className="import-panel">
            <ProfileCard />
            <h3>Import Preview</h3>
            <MetricList
              rows={[
                ['Holdings', `${props.plaid?.imported.holdings ?? 42}`, 'Stocks, ETFs, Bonds'],
                ['Tax Lots', `${props.plaid?.imported.taxLots ?? 6}`, 'Cost basis records'],
                ['Cash Balance', '$27,430.18', 'Across 2 accounts'],
                ['Recent Transactions', `${props.plaid?.imported.transactions ?? 128}`, 'Last 90 days'],
              ]}
            />
            <h3>Import Status</h3>
            {['Accounts detected', 'Holdings categorized', 'Context packet created', 'Ready to enhance your plan'].map((item) => (
              <div className="status-line" key={item}><CheckCircle size={20} /> {item}</div>
            ))}
          </aside>
        </div>
      </section>
    </AppChrome>
  )
}
