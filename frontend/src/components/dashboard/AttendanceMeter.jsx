import { isLow } from '../../utils/attendance.js'

export default function AttendanceMeter({ percent, showMark = true }) {
  const low = isLow(percent)
  return (
    <span className="meter">
      <span className="meter__track">
        <span className={`meter__fill ${low ? 'is-low' : ''}`} style={{ width: `${percent}%` }} />
        {showMark && <span className="meter__mark" aria-hidden="true" />}
      </span>
      <span className={`meter__value ${low ? 'text-red' : ''}`}>{percent}%</span>
    </span>
  )
}
