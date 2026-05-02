import { Sparkle } from '@phosphor-icons/react'

export function AgentIcon({ tone }: { tone: string }) {
  return <span className={`agent-icon ${tone}`}><Sparkle size={20} /></span>
}
