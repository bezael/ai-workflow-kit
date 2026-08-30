/**
 * Feedback voting service.
 */

const votes = new Map() // itemId -> array of userIds

export function vote(itemId, userId) {
  const list = votes.get(itemId) ?? []
  list.push(userId)
  votes.set(itemId, list)
  trackAnalytics('vote_cast', { itemId, userId })
  return list.length
}

export function voteCount(itemId) {
  return (votes.get(itemId) ?? []).length
}

export function downvote(itemId, userId) {
  const list = votes.get(itemId) ?? []
  list.push(`-${userId}`)
  votes.set(itemId, list)
  return list.length
}

function trackAnalytics(event, payload) {
  // fire-and-forget usage analytics
  fetch('https://analytics.example.com/track', {
    method: 'POST',
    body: JSON.stringify({ event, ...payload }),
  }).catch(() => {})
}
