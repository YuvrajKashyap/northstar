import { Bell, Flag, Pulse, Target, UserCircle, Wallet } from '@phosphor-icons/react'
import type { MemoryGraphNode } from '@calmvest/shared'

export function MemoryKindIcon({ kind }: { kind: MemoryGraphNode['kind'] }) {
  const Icon =
    kind === 'goal'
      ? Target
      : kind === 'risk'
        ? Pulse
        : kind === 'account'
          ? Wallet
          : kind === 'tax'
            ? Flag
            : kind === 'communication'
              ? Bell
              : UserCircle

  return <Icon size={20} />
}
