export default function Panel({ title, description, action, className = '', children }) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || action) && (
        <div className="panel__head">
          <div>
            {title && <h2 className="panel__title">{title}</h2>}
            {description && <p className="panel__desc">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
