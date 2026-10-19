import { isLow } from '../../utils/attendance.js'

// One bar per batch, with a dashed line at the 75% minimum
export default function BatchChart({ batches }) {
  return (
    <div className="batch-chart">
      {batches.map((batch) => {
        const low = isLow(batch.attendance)
        return (
          <div className="batch-chart__row" key={batch.name}>
            <div>
              <div className="strong">{batch.name}</div>
              <div className="batch-chart__detail">{batch.detail}</div>
            </div>
            <div className="batch-chart__track">
              <span
                className={`batch-chart__bar ${low ? 'is-low' : ''}`}
                style={{ width: `${batch.attendance}%` }}
              />
              <span className="batch-chart__line" aria-hidden="true" />
            </div>
            <span className={`batch-chart__value ${low ? 'text-red' : 'strong'}`}>{batch.attendance}%</span>
          </div>
        )
      })}
    </div>
  )
}
