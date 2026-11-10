import { useState } from 'react'
import { api } from '../../services/api.js'

// Delete with a second "Yes, delete" click, then calls the API
export default function DeleteButton({ path, token, onDeleted }) {
  const [confirming, setConfirming] = useState(false)
  if (!confirming) {
    return (
      <button type="button" className="btn btn--outline btn--quiet" onClick={() => setConfirming(true)}>
        Delete
      </button>
    )
  }
  return (
    <button
      type="button"
      className="btn btn--danger"
      onClick={() =>
        api(path, { method: 'DELETE', token })
          .then(onDeleted)
          .catch(() => setConfirming(false))
      }
    >
      Yes, delete
    </button>
  )
}
