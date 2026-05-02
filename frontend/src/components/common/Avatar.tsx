export function Avatar({ name, compact }: { name: string; compact?: boolean }) {
  return (
    <span className={compact ? 'avatar compact-avatar' : 'avatar'}>
      {name.split(' ').map((part) => part[0]).join('')}
    </span>
  )
}
