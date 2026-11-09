import { shortDate } from '../../utils/activities.js'

// One file in a subject list. `actions` lets the admin page add Delete.
export default function MaterialRow({ item, actions = null }) {
  return (
    <div className="material">
      <span className="material__icon" aria-hidden="true">
        PDF
      </span>
      <div className="material__body">
        <div className="material__title">{item.title}</div>
        <div className="material__meta">
          {item.note && `${item.note} · `}
          {shortDate(item.createdAt)}
          {item.postedBy?.name && ` · ${item.postedBy.name}`}
        </div>
      </div>
      <div className="material__actions">
        <a className="btn btn--outline" href={item.link} target="_blank" rel="noreferrer">
          Open
        </a>
        {actions}
      </div>
    </div>
  )
}
