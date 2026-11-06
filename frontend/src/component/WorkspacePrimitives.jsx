import { useState } from 'react'
import '../style/WorkspacePrimitives.css'

export function BrandMark({ className = 'brand-mark-grid' }) {
  return (
    <span className={className} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

export function UserAvatar({ user, initials, className }) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <span className={className} role="img" aria-label={`${user.name || 'User'} profile picture`}>
      {initials}
      {user.avatar && !imageFailed && (
        <img
          className="user-avatar-image"
          src={user.avatar}
          alt=""
          onError={() => setImageFailed(true)}
        />
      )}
    </span>
  )
}
