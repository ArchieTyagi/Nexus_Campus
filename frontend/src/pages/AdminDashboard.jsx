import PageHeader from '../components/layout/PageHeader.jsx'
import Panel from '../components/ui/Panel.jsx'
import Icon from '../components/ui/Icon.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import NotificationButton from '../components/ui/NotificationButton.jsx'
import AttendanceMeter from '../components/dashboard/AttendanceMeter.jsx'
import { greeting, todayLabel } from '../utils/date.js'
import {
  adminUser,
  attentionItems,
  campusStats,
  departments,
  liveClasses,
  quickActions,
  recentNotices,
} from '../data/admin.js'

const deptColumns = { gridTemplateColumns: 'minmax(220px, 2.2fr) 0.7fr 0.8fr 0.8fr 1.8fr' }

export default function AdminDashboard() {
  const firstName = adminUser.name.split(' ')[0]

  return (
    <>
      <PageHeader
        kicker={todayLabel()}
        title={`${greeting()}, ${firstName}`}
        subtitle="Here is how the campus is running today, and what needs you."
        stats={campusStats}
        actions={
          <>
            <label className="search">
              <Icon name="search" size={18} />
              <span className="sr-only">Search</span>
              <input type="search" placeholder="Search students, teachers, courses" />
            </label>
            <NotificationButton unread={3} />
            <Avatar name={adminUser.name} detail={adminUser.detail} />
          </>
        }
      />

      <div className="columns">
        <div className="column column--wide">
          <Panel
            title="Needs your attention"
            description="Things that will stop classes or attendance from running smoothly."
          >
            {attentionItems.map((item) => (
              <div className="list-row" key={item.title}>
                <span className={`severity severity--${item.severity}`} aria-hidden="true" />
                <div className="list-row__body">
                  <div className="list-row__title">{item.title}</div>
                  <div className="list-row__meta">{item.detail}</div>
                </div>
                <button type="button" className="btn btn--outline">
                  {item.action}
                </button>
              </div>
            ))}
          </Panel>

          <Panel
            title="Departments"
            action={
              <span className="legend">
                <span className="legend__tick" aria-hidden="true" />
                Attendance this semester, 75% minimum
              </span>
            }
          >
            <div className="table-scroll">
              <div className="data-table">
                <div className="data-table__row data-table__row--head" style={deptColumns}>
                  <span>Department</span>
                  <span>Batches</span>
                  <span>Students</span>
                  <span>Teachers</span>
                  <span>Attendance</span>
                </div>
                {departments.map((dept) => (
                  <div className="data-table__row" style={deptColumns} key={dept.name}>
                    <span className="strong">{dept.name}</span>
                    <span>{dept.batches}</span>
                    <span>{dept.students}</span>
                    <span>{dept.teachers}</span>
                    <AttendanceMeter percent={dept.attendance} />
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        <div className="column">
          <Panel title="Quick actions">
            <div className="action-grid">
              {quickActions.map((action) => (
                <button type="button" className="action-tile" key={action.label}>
                  <span className="action-tile__icon">
                    <Icon name={action.icon} size={19} strokeWidth={1.9} />
                  </span>
                  {action.label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel
            title="Running now"
            action={
              <span className="pill pill--amber">
                <span className="pill__dot" aria-hidden="true" />
                11:20
              </span>
            }
          >
            {liveClasses.map((cls) => (
              <div className="list-row" key={cls.room}>
                <span className="tag">{cls.room}</span>
                <div className="list-row__body">
                  <div className="list-row__title">{cls.course}</div>
                  <div className="list-row__meta">{cls.detail}</div>
                </div>
              </div>
            ))}
            <a href="#" className="panel__link">
              See all 18 classes
            </a>
          </Panel>

          <Panel title="Recent notices">
            {recentNotices.map((notice) => (
              <div className="list-row" key={notice.title}>
                <div className="list-row__body">
                  <div className="list-row__title">{notice.title}</div>
                  <div className="list-row__meta">{notice.meta}</div>
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  )
}
