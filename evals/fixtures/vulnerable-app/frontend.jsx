// FIXTURE: Purposely vulnerable React frontend for /vibe-audit eval
// Contains: XSS via dangerouslySetInnerHTML, no loading states

import { useState } from 'react'

// 🔴 Problem: XSS — user content rendered without sanitization
function Comment({ content }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: content }} />
  )
}

// 🟡 Problem: no loading / error states
function UserProfile({ userId }) {
  const [user, setUser] = useState(null)

  // No isLoading, no error state — blank render on slow network
  fetch(`/api/users/${userId}`)
    .then(r => r.json())
    .then(setUser)

  return (
    <div>
      <h1>{user?.name}</h1>
      <p>{user?.email}</p>
    </div>
  )
}

export { Comment, UserProfile }
