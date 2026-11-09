import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import NoticeCard from '../../components/notices/NoticeCard.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'

export default function NoticesPage() {
  const { token } = useAuth()
  const [notices, setNotices] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/notices', { token })
      .then((list) => {
        setNotices(list)
        // The "New" dots stay for this visit, next time they are gone
        if (list.some((n) => n.isNew)) api('/notices/seen', { method: 'POST', token }).catch(() => {})
      })
      .catch((err) => setError(err.message))
  }, [token])

  const newCount = notices?.filter((n) => n.isNew).length ?? 0
  const important = notices?.filter((n) => n.important).length ?? 0

  return (
    <>
      <PageHeader
        kicker="Notices"
        title="Notices and announcements"
        subtitle="Everything your college, department and batch posts, in one place."
        stats={[
          { label: 'New', value: notices ? newCount : '...', note: 'since your last visit', tone: newCount ? 'amber' : undefined },
          { label: 'Important', value: notices ? important : '...', note: 'read these first', tone: important ? 'red' : undefined },
          { label: 'All notices', value: notices ? notices.length : '...', note: 'newest first' },
        ]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <Panel>
        {notices && notices.length === 0 && <p className="empty-note">No notices yet.</p>}
        <div className="notice-list">
          {notices?.map((notice) => (
            <NoticeCard key={notice._id} notice={notice} isNew={notice.isNew} />
          ))}
        </div>
      </Panel>
    </>
  )
}
