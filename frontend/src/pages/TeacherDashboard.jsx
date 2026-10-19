import { useState } from 'react'
import PageHeader from '../components/layout/PageHeader.jsx'
import Panel from '../components/ui/Panel.jsx'
import Icon from '../components/ui/Icon.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import NotificationButton from '../components/ui/NotificationButton.jsx'
import DayTimeline from '../components/dashboard/DayTimeline.jsx'
import { greeting, todayLabel } from '../utils/date.js'
import { initials } from '../utils/names.js'
import {
  DEMO_NOW,
  currentClass,
  noticeTargets,
  studentsToWatch,
  teacherPeriods,
  teacherStats,
  teacherUser,
} from '../data/teacher.js'

function NoticeForm() {
  const [notice, setNotice] = useState({ target: noticeTargets[0], title: '', message: '' })
  const update = (field) => (event) => setNotice({ ...notice, [field]: event.target.value })
  const ready = notice.title.trim() && notice.message.trim()

  return (
    <form className="form" onSubmit={(event) => event.preventDefault()}>
      <label className="field">
        Send to
        <select value={notice.target} onChange={update('target')}>
          {noticeTargets.map((target) => (
            <option key={target}>{target}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Title
        <input type="text" value={notice.title} onChange={update('title')} placeholder="For example, lab records due on Friday" />
      </label>
      <label className="field">
        Message
        <textarea rows="3" value={notice.message} onChange={update('message')} placeholder="What should students know?" />
      </label>
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={!ready}>
          Post notice
        </button>
      </div>
    </form>
  )
}

export default function TeacherDashboard() {
  const surname = teacherUser.name.split(' ').pop()

  return (
    <>
      <PageHeader
        kicker={todayLabel()}
        title={`${greeting()}, Prof. ${surname}`}
        subtitle={teacherUser.courses}
        stats={teacherStats}
        actions={
          <>
            <NotificationButton unread={1} />
            <Avatar name={teacherUser.name} />
          </>
        }
      />

      <section className="live-class">
        <div>
          <span className="pill live-class__pill">
            <span className="pill__dot" aria-hidden="true" />
            In class now, ends at {currentClass.ends}
          </span>
          <h2 className="live-class__title">{currentClass.title}</h2>
          <p className="live-class__meta">{currentClass.detail}</p>
        </div>
        <a href="#" className="btn btn--primary btn--large">
          <Icon name="checklist" strokeWidth={2} />
          Mark attendance
        </a>
      </section>

      <Panel title="Your day" action={<a href="#" className="panel__link">Full week</a>}>
        <DayTimeline periods={teacherPeriods} now={DEMO_NOW} />
      </Panel>

      <div className="columns">
        <div className="column">
          <Panel title="Students to watch" description="Below 75% in one of your courses.">
            {studentsToWatch.map((student) => (
              <div className="list-row" key={student.name}>
                <span className="person-avatar" aria-hidden="true">{initials(student.name)}</span>
                <div className="list-row__body">
                  <div className="list-row__title">{student.name}</div>
                  <div className="list-row__meta">{student.course}</div>
                </div>
                <div className="align-right">
                  <div className="text-red">{student.attendance}%</div>
                  <div className="list-row__meta">{student.missed}</div>
                </div>
              </div>
            ))}
          </Panel>
        </div>

        <div className="column">
          <Panel title="Post a notice">
            <NoticeForm />
          </Panel>
        </div>
      </div>
    </>
  )
}
