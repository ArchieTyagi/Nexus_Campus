import { useEffect, useState } from 'react'
import ChangePasswordForm from './ChangePasswordForm.jsx'

// Small pop-up over the page for changing the password any time
export default function ChangePasswordDialog({ onClose }) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog__head">
          <h2 id="change-password-title" className="login__title">
            Change password
          </h2>
          <button type="button" className="link-button" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
        {done ? (
          <>
            <p className="dialog__done">Your password is changed. Use the new one next time you log in.</p>
            <button type="button" className="btn btn--primary login__submit" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <ChangePasswordForm onDone={() => setDone(true)} />
        )}
      </div>
    </div>
  )
}
