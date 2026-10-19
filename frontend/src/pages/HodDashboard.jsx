import PageHeader from '../components/layout/PageHeader.jsx'
import Panel from '../components/ui/Panel.jsx'
import Icon from '../components/ui/Icon.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import NotificationButton from '../components/ui/NotificationButton.jsx'
import BatchChart from '../components/dashboard/BatchChart.jsx'
import { greeting } from '../utils/date.js'
import {
  MAX_TEACHING_HOURS,
  batchAttendance,
  departmentStats,
  facultyLoad,
  hodUser,
  studentsAtRisk,
} from '../data/hod.js'

const riskColumns = { gridTemplateColumns: 'minmax(170px, 1.6fr) 1fr 1fr 0.7fr 1.5fr' }

export default function HodDashboard() {
  const surname = hodUser.name.split(' ').pop()
  const lowBatches = batchAttendance.filter((batch) => batch.attendance < 75).length

  return (
    <>
      <PageHeader
        kicker={hodUser.department}
        title={`${greeting()}, Dr. ${surname}`}
        subtitle="Semester ends on 12 December. Attendance is up across the department this month."
        stats={departmentStats}
        actions={
          <>
            <a href="#" className="btn btn--primary">
              <Icon name="plus" size={18} strokeWidth={2.2} />
              Post a department notice
            </a>
            <NotificationButton />
            <Avatar name={hodUser.name} detail={hodUser.detail} />
          </>
        }
      />

      <Panel
        title="Attendance by batch"
        description={`${lowBatches} of ${batchAttendance.length} batches are under the 75% line this semester.`}
        action={
          <span className="legend">
            <span className="legend__dash" aria-hidden="true" />
            College minimum, 75%
          </span>
        }
      >
        <BatchChart batches={batchAttendance} />
      </Panel>

      <div className="columns">
        <div className="column column--wide">
          <Panel title="Students below 75%" action={<a href="#" className="panel__link">See all 37</a>}>
            <div className="table-scroll">
              <div className="data-table">
                <div className="data-table__row data-table__row--head" style={riskColumns}>
                  <span>Student</span>
                  <span>Roll number</span>
                  <span>Batch</span>
                  <span>Overall</span>
                  <span>Lowest subject</span>
                </div>
                {studentsAtRisk.map((student) => (
                  <div className="data-table__row" style={riskColumns} key={student.roll}>
                    <a href="#" className="strong" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
                      {student.name}
                    </a>
                    <span className="muted">{student.roll}</span>
                    <span>{student.batch}</span>
                    <span className="text-red">{student.attendance}%</span>
                    <span>{student.lowest}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        <div className="column">
          <Panel title="Faculty load this week" description={`Teaching hours against the ${MAX_TEACHING_HOURS} hour limit.`}>
            <div className="load-list">
              {facultyLoad.map((teacher) => {
                const over = teacher.hours > MAX_TEACHING_HOURS
                const width = Math.min(100, Math.round((teacher.hours / MAX_TEACHING_HOURS) * 100))
                return (
                  <div className="load-item" key={teacher.name}>
                    <div className="load-item__top">
                      <span className="strong">{teacher.name}</span>
                      <span className={over ? 'text-red' : 'strong'}>{teacher.hours} h</span>
                    </div>
                    <div className="meter__track">
                      <span className={`meter__fill ${over ? 'is-low' : 'is-amber'}`} style={{ width: `${width}%` }} />
                    </div>
                    <div className="load-item__note">{teacher.courses}</div>
                  </div>
                )
              })}
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
