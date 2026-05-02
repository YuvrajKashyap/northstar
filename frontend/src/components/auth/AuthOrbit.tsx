import { Heart, ShieldCheck, TrendUp, UserCircle, Users, Wallet } from '@phosphor-icons/react'

const nodes = [
  { label: 'Values', lines: ['Freedom & flexibility', 'Lifelong learning'], icon: Heart, color: 'green', cls: 'ag-top' },
  { label: 'Financial', lines: ['Retire by 60', 'Tax efficient'], icon: TrendUp, color: 'green', cls: 'ag-left' },
  { label: 'Life', lines: ['Family first', 'Meaningful experiences'], icon: Users, color: 'blue', cls: 'ag-right' },
  { label: 'Risk', lines: ['Moderate', 'Sleep at night'], icon: ShieldCheck, color: 'violet', cls: 'ag-bl' },
  { label: 'Cash Flow', lines: ['Optimize income', 'Build buffer'], icon: Wallet, color: 'gold', cls: 'ag-br' },
]

export function AuthOrbit() {
  return (
    <div className="auth-graph">
      {/* SVG connection lines — coordinates match CSS node positions in a 440×400 viewBox */}
      <svg
        className="auth-graph-lines"
        viewBox="0 0 440 400"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g stroke="rgba(118,232,135,0.3)" strokeWidth="1" strokeDasharray="5 4" fill="none">
          {/* center (220,200) → top node center (220,52) */}
          <line x1="220" y1="150" x2="220" y2="90" />
          {/* center (220,200) → left node (5+65=70, 160+40=200) */}
          <line x1="170" y1="200" x2="135" y2="200" />
          {/* center (220,200) → right node (305+65=370, 200) */}
          <line x1="270" y1="200" x2="305" y2="200" />
          {/* center → bottom-left (30+65=95, 310+40=350) */}
          <line x1="195" y1="245" x2="115" y2="315" />
          {/* center → bottom-right (280+65=345, 350) */}
          <line x1="245" y1="245" x2="330" y2="315" />
        </g>
        {/* endpoint dots at node side */}
        <g fill="rgba(118,232,135,0.6)">
          <circle cx="220" cy="90" r="3.5" />
          <circle cx="135" cy="200" r="3.5" />
          <circle cx="305" cy="200" r="3.5" />
          <circle cx="115" cy="315" r="3.5" />
          <circle cx="330" cy="315" r="3.5" />
        </g>
      </svg>

      {/* Center node */}
      <div className="auth-graph-center">
        <UserCircle size={26} weight="duotone" />
        <strong>You</strong>
        <span>At the center of everything</span>
      </div>

      {/* Satellite nodes */}
      {nodes.map((n) => {
        const Icon = n.icon
        return (
          <div className={`auth-graph-node ${n.cls}`} key={n.label}>
            <span className={`ag-node-icon ${n.color}`}>
              <Icon size={13} weight="bold" />
            </span>
            <strong>{n.label}</strong>
            <span>{n.lines[0]}<br />{n.lines[1]}</span>
          </div>
        )
      })}
    </div>
  )
}
