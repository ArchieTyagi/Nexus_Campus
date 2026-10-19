import { initials } from '../../utils/names.js'

export default function Avatar({ name, detail }) {
  return (
    <div className="avatar" role="img" aria-label={detail ? `${name}, ${detail}` : name}>
      {initials(name)}
    </div>
  )
}
