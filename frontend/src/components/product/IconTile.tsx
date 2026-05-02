import type { ReactNode } from 'react'

export function IconTile({ children, tone = 'green' }: { children: ReactNode; tone?: string }) {
  return <span className={`icon-tile ${tone}`}>{children}</span>
}
