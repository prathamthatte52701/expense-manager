import { AlertCircle, Inbox } from 'lucide-react'

export function PageHeader({ eyebrow, title, description, icon: Icon, actions }) {
  return (
    <section className="page-header">
      <div className="page-header-title">
        {Icon && (
          <div className="page-header-icon">
            <Icon className="size-5" />
          </div>
        )}
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
          {description && <p className="page-description">{description}</p>}
        </div>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </section>
  )
}

export function MetricCard({ label, value, detail, icon: Icon, tone = 'neutral' }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-card-top">
        <p>{label}</p>
        {Icon && (
          <span className="metric-card-icon">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <strong>{value}</strong>
      {detail && <span>{detail}</span>}
    </article>
  )
}

export function DataCard({ title, description, actions, children, className = '' }) {
  return (
    <section className={`data-card ${className}`}>
      {(title || description || actions) && (
        <div className="data-card-header">
          <div>
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="data-card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <section className="empty-state">
      <div className="empty-state-icon">
        <Icon className="size-6" />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div>{action}</div>}
    </section>
  )
}

export function FormField({ label, hint, error, children }) {
  return (
    <label className={`form-field ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      {children}
      {error ? <small>{error}</small> : hint && <small>{hint}</small>}
    </label>
  )
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  return (
    <button className={`ui-button ui-button-${variant} ui-button-${size} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function AlertBanner({ tone = 'info', title, children, icon: Icon = AlertCircle }) {
  return (
    <div className={`alert-banner alert-${tone}`}>
      <Icon className="size-5" />
      <div>
        {title && <strong>{title}</strong>}
        {children && <p>{children}</p>}
      </div>
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={`tab ${value === tab.value ? 'is-active' : ''}`}
          onClick={() => onChange(tab.value)}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
        >
          {tab.icon && <tab.icon className="size-4" />}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function DataTable({ columns, rows, emptyText = 'No records found.' }) {
  return (
    <div className="data-table-shell">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="data-table-empty">{emptyText}</p>}
    </div>
  )
}
