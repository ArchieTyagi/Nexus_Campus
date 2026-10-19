import { attendanceAdvice } from '../../utils/attendance.js'

const columns = { gridTemplateColumns: 'minmax(210px, 1.6fr) minmax(220px, 1.4fr) 90px 64px minmax(200px, 1.5fr)' }

function RecentMarks({ recent }) {
  const marks = recent.split('')
  const present = marks.filter((mark) => mark === 'P').length
  return (
    <div className="marks" role="img" aria-label={`Present in ${present} of the last ${marks.length} classes`}>
      {marks.map((mark, index) => (
        <span key={index} className={`mark ${mark === 'P' ? 'is-present' : 'is-absent'}`} />
      ))}
    </div>
  )
}

// One row per subject: recent classes as register marks, plus what the numbers mean
export default function AttendanceRegister({ subjects }) {
  return (
    <div className="table-scroll">
      <div className="data-table data-table--wide">
        <div className="data-table__row data-table__row--head" style={columns}>
          <span>Subject</span>
          <span>Recent classes</span>
          <span>Attended</span>
          <span>Share</span>
          <span>What it means</span>
        </div>
        {subjects.map((subject) => {
          const advice = attendanceAdvice(subject.attended, subject.total)
          return (
            <div className="data-table__row" style={columns} key={subject.code}>
              <div>
                <div className="strong">{subject.name}</div>
                <div className="register__meta">
                  {subject.code}, {subject.teacher}
                </div>
              </div>
              <RecentMarks recent={subject.recent} />
              <span>
                {subject.attended} of {subject.total}
              </span>
              <span className={advice.ok ? 'strong' : 'text-red'}>{advice.percent}%</span>
              <span className={advice.ok ? 'muted register__note' : 'text-red register__note'}>{advice.message}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
