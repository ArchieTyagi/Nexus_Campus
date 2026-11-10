import { MODES, daysLeft, deadlineLabel } from '../../utils/opportunities.js'

export default function InternshipCard({ internship, actions = null, footer = null }) {
  const left = daysLeft(internship.deadline)
  return (
    <article className={`internship ${internship.isOpen ? '' : 'is-closed'}`}>
      <div className="internship__head">
        <div>
          <h3 className="internship__role">{internship.role}</h3>
          <p className="internship__company">{internship.company}</p>
        </div>
        <span className={`internship__deadline ${internship.isOpen && left <= 2 ? 'is-soon' : ''}`}>
          {deadlineLabel(internship.deadline)}
        </span>
      </div>
      <div className="internship__tags">
        <span className="notice__tag">{MODES[internship.mode]}</span>
        {internship.location && <span className="notice__tag">{internship.location}</span>}
        {internship.stipend && <span className="notice__tag">Stipend: {internship.stipend}</span>}
        {internship.duration && <span className="notice__tag">{internship.duration}</span>}
      </div>
      {internship.eligibility && (
        <p className="internship__text">
          <strong>Who can apply:</strong> {internship.eligibility}
        </p>
      )}
      {internship.details && <p className="internship__text internship__details">{internship.details}</p>}
      <div className="internship__actions">{actions}</div>
      {footer}
    </article>
  )
}
