import { isLow } from '../../utils/attendance.js'

// One bar per batch, with a dashed line at the 75% minimum. attendance can be null (no classes yet).
export default function BatchChart({ batches }) {
  return (
    <div className="batch-chart">
      {batches.map((batch) => {
        const none = batch.attendance === null || batch.attendance === undefined
        const low = !none && isLow(batch.attendance)
        return (
          <div className="batch-chart__row" key={batch.name}>
            <div>
              <div className="strong">{batch.name}</div>
              <div className="batch-chart__detail">{batch.detail}</div>
            </div>
            <div className="batch-chart__track">
              <span
                className={`batch-chart__bar ${low ? 'is-low' : ''}`}
                style={{ width: `${none ? 0 : batch.attendance}%` }}
              />
              <span className="batch-chart__line" aria-hidden="true" />
            </div>
            <span className={`batch-chart__value ${low ? 'text-red' : none ? 'muted' : 'strong'}`}>
              {none ? '—' : `${batch.attendance}%`}
            </span>
          </div>
        )
      })}
    </div>
  )
}
