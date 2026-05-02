import type { ReactNode } from 'react'
import { CaretDown, MagnifyingGlass } from '@phosphor-icons/react'

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children?: ReactNode
}) {
  return (
    <header className="app-page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="command-bar">
        <div className="search-box">
          <MagnifyingGlass size={18} /> Search memories... <kbd>Cmd K</kbd>
        </div>
        {children}
        <button className="profile-chip" type="button">
          <div className="avatar" />
          <div>
            <strong>Maya Patel</strong>
            <span>Primary profile</span>
          </div>
          <CaretDown size={15} />
        </button>
      </div>
    </header>
  )
}
