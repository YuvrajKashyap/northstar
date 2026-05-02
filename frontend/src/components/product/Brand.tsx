export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <button className="brand" type="button" onClick={onClick}>
      <span className="brand-mark">Northstar</span>
      <span className="brand-sub">Agent OS</span>
    </button>
  )
}
