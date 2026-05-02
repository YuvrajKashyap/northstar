export function AppPageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="app-page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  )
}
