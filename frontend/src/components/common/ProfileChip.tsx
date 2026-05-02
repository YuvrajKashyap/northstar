import { CaretDown } from '@phosphor-icons/react'
import { Avatar } from './Avatar'

export function ProfileChip({ compact }: { compact?: boolean }) {
  return (
    <button className="profile-chip" type="button">
      <Avatar name="Maya Patel" compact />
      {!compact ? <span><strong>Maya Patel</strong><small>Beginner Investor</small></span> : null}
      <CaretDown size={16} />
    </button>
  )
}
