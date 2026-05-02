import { MagnifyingGlass } from '@phosphor-icons/react'
import { Logo } from '../brand/Logo'
import { ProfileChip } from '../common/ProfileChip'

export function MiniOsHeader() {
  return (
    <div className="mini-os-header">
      <Logo />
      <div className="mini-search"><MagnifyingGlass size={14} /> Search memories...</div>
      <ProfileChip compact />
    </div>
  )
}
