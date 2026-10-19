import Icon from './Icon.jsx'

export default function NotificationButton({ unread = 0 }) {
  const label = unread ? `Notifications, ${unread} unread` : 'Notifications'
  return (
    <button type="button" className="icon-button" aria-label={label}>
      <Icon name="bell" />
      {unread > 0 && <span className="icon-button__dot" />}
    </button>
  )
}
