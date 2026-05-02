import { Brain, ChartLine, ChatCircle, Receipt } from '@phosphor-icons/react'

const iconMap: Record<string, typeof Brain> = {
  green:  Brain,
  violet: ChartLine,
  gold:   Receipt,
  blue:   ChatCircle,
}

export function AgentIcon({ tone, compact }: { tone: string; compact?: boolean }) {
  const Icon = iconMap[tone] ?? Brain
  const size = compact ? 16 : 20
  return (
    <span className={`agent-icon ${tone}${compact ? ' compact' : ''}`}>
      <Icon size={size} />
    </span>
  )
}
