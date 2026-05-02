export function Avatar({ name, compact }: { name: string; compact?: boolean }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <span className={`avatar ${compact ? 'avatar--compact' : ''}`} aria-hidden>
      {initials}
    </span>
  )
}
