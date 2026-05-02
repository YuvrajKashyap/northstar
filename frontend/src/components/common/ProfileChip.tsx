import { CaretDown } from '@phosphor-icons/react'
import { Avatar } from './Avatar'

export function ProfileChip({
  name = 'Northstar user',
  role = 'Beginner investor',
  compact,
  onClick,
  ariaLabel,
  expanded,
}: {
  name?: string
  role?: string
  compact?: boolean
  onClick?: () => void
  /** Override default accessible name */
  ariaLabel?: string
  expanded?: boolean
}) {
  return (
    <button
      className={`profile-chip${compact ? ' profile-chip--compact' : ''}`}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? (compact ? `${name}, ${role}` : undefined)}
      aria-haspopup="menu"
      aria-expanded={expanded}
    >
      <Avatar name={name} compact />
      {!compact ? (
        <span className="profile-chip__text">
          <strong>{name}</strong>
          <small>{role}</small>
        </span>
      ) : null}
      <CaretDown className="profile-chip__caret" size={16} weight="regular" aria-hidden />
    </button>
  )
}
