import northstarLogo from '../../assets/northstar-logo.svg'

export function Logo({ onClick }: { onClick?: () => void }) {
  const handleClick = onClick ?? (() => window.location.reload())

  return (
    <button className="brand" type="button" onClick={handleClick}>
      <img className="brand-logo" src={northstarLogo} alt="" aria-hidden="true" />
      <span>
        <span className="brand-mark">Northstar</span>
        <span className="brand-sub">Goal-aware investing</span>
      </span>
    </button>
  )
}
