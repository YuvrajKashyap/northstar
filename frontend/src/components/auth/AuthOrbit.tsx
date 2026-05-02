export function AuthOrbit() {
  return (
    <div className="auth-orbit">
      <div className="center-orbit">You<span>At the center</span></div>
      {['Values', 'Life', 'Cash Flow', 'Risk', 'Financial'].map((item, index) => (
        <div className={`auth-orbit-card auth-orbit-${index}`} key={item}><strong>{item}</strong><span>Context node</span></div>
      ))}
    </div>
  )
}
