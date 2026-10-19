// White header panel used at the top of every dashboard
export default function PageHeader({ kicker, title, subtitle, actions, stats = [] }) {
  return (
    <header className="page-header">
      <div className="page-header__top">
        <div>
          {kicker && <p className="page-header__kicker">{kicker}</p>}
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>

      {stats.length > 0 && (
        <div className="stats">
          {stats.map((stat) => (
            <div className="stat" key={stat.label}>
              <span className="stat__label">{stat.label}</span>
              <span className={`stat__value ${stat.tone ? `is-${stat.tone}` : ''}`}>{stat.value}</span>
              <span className="stat__note">{stat.note}</span>
            </div>
          ))}
        </div>
      )}
    </header>
  )
}
