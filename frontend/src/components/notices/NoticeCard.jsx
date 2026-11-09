import { shortDate } from '../../utils/activities.js'
import { audienceLabel } from '../../utils/notices.js'

// One notice. `actions` lets the admin page add Pin / Delete buttons.
export default function NoticeCard({ notice, isNew = false, actions = null }) {
  return (
    <article className={`notice ${notice.pinned ? 'is-pinned' : ''}`}>
      <div className="notice__head">
        <h3 className="notice__title">
          {isNew && <span className="notice__new" aria-label="New" />}
          {notice.title}
        </h3>
        <div className="notice__tags">
          {notice.pinned && <span className="notice__tag">Pinned</span>}
          {notice.important && <span className="notice__tag notice__tag--important">Important</span>}
        </div>
      </div>
      <p className="notice__meta">
        {notice.postedBy?.name ?? 'Admin'} · {audienceLabel(notice)} · {shortDate(notice.createdAt)}
      </p>
      <p className="notice__body">{notice.body}</p>
      {(notice.link || actions) && (
        <div className="notice__foot">
          {notice.link && (
            <a className="btn btn--outline" href={notice.link} target="_blank" rel="noreferrer">
              Open link
            </a>
          )}
          {actions}
        </div>
      )}
    </article>
  )
}
