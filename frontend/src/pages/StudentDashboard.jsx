import PageHeader from '../components/layout/PageHeader.jsx'
import Panel from '../components/ui/Panel.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import NotificationButton from '../components/ui/NotificationButton.jsx'
import DayTimeline from '../components/dashboard/DayTimeline.jsx'
import AttendanceRegister from '../components/dashboard/AttendanceRegister.jsx'
import { MINIMUM } from '../utils/attendance.js'
import { todayLabel } from '../utils/date.js'
import { DEMO_NOW, events, notices, studentPeriods, studentUser, subjects } from '../data/student.js'

export default function StudentDashboard() {
  const firstName = studentUser.name.split(' ')[0]
  const attended = subjects.reduce((sum, subject) => sum + subject.attended, 0)
  const total = subjects.reduce((sum, subject) => sum + subject.total, 0)
  const overall = Math.round((attended / total) * 100)
  const belowCount = subjects.filter((subject) => subject.attended / subject.total < MINIMUM).length
  const unread = notices.filter((notice) => notice.unread).length

  const stats = [
    { label: 'Overall attendance', value: `${overall}%`, note: 'minimum is 75%' },
    { label: 'Subjects below 75%', value: String(belowCount), note: 'see the register below', tone: belowCount ? 'red' : undefined },
    { label: 'Next class', value: '11:40', note: 'Probability, Room 210' },
    { label: 'Unread notices', value: String(unread), note: 'exams start 2 November' },
  ]

  return (
    <>
      <PageHeader
        kicker={`${todayLabel()}, semester 3`}
        title={`Hi ${firstName}, DBMS is on now`}
        subtitle={studentUser.batch}
        stats={stats}
        actions={
          <>
            <NotificationButton unread={unread} />
            <Avatar name={studentUser.name} detail={studentUser.roll} />
          </>
        }
      />

      <Panel title="Today's classes" action={<a href="#" className="panel__link">Full week</a>}>
        <DayTimeline periods={studentPeriods} now={DEMO_NOW} />
      </Panel>

      <Panel
        title="Attendance register"
        description={`Above the 75% minimum in ${subjects.length - belowCount} of ${subjects.length} subjects.`}
        action={
          <div className="register-legend">
            <span>
              <span className="mark is-present" aria-hidden="true" />
              Present
            </span>
            <span>
              <span className="mark is-absent" aria-hidden="true" />
              Absent
            </span>
            <span>Last 12 classes, oldest on the left</span>
          </div>
        }
      >
        <AttendanceRegister subjects={subjects} />
      </Panel>

      <div className="columns">
        <div className="column column--wide">
          <Panel title="Notices" action={<a href="#" className="panel__link">All notices</a>}>
            {notices.map((notice) => (
              <div className="list-row" key={notice.title}>
                <span className={`unread-dot ${notice.unread ? 'is-unread' : ''}`} aria-hidden="true" />
                <div className="list-row__body">
                  <div className="list-row__title">{notice.title}</div>
                  <div className="list-row__meta">{notice.meta}</div>
                </div>
              </div>
            ))}
          </Panel>
        </div>

        <div className="column">
          <Panel title="Coming up">
            {events.map((event) => (
              <div className="list-row" key={event.title}>
                <div className="date-chip">
                  <span className="date-chip__month">{event.month}</span>
                  <span className="date-chip__day">{event.day}</span>
                </div>
                <div className="list-row__body">
                  <div className="list-row__title">{event.title}</div>
                  <div className="list-row__meta">{event.detail}</div>
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  )
}
