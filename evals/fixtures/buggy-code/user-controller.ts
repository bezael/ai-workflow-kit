// FIXTURE: Code with known bugs for /review eval
// Planted bugs:
//   1. SQL injection (line ~18) — user input concatenated directly into query
//   2. Missing null check (line ~28) — user.profile.avatar crashes if profile is null
//   3. Sensitive data in error response (line ~35) — full error object returned to client
//   4. No authorization check (line ~22) — any authenticated user can get any user's data

import { Request, Response } from 'express'
import { db } from '../db'

export async function getUserById(req: Request, res: Response) {
  const { id } = req.params

  // Bug 1: SQL injection — id is not sanitized
  const query = `SELECT * FROM users WHERE id = '${id}'`
  const user = await db.raw(query)

  // Bug 2: no authorization — any user can fetch any other user's data
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  // Bug 3: null crash — if user.profile is null, .avatar throws
  const avatar = user.profile.avatar

  // Bug 4: full error stack exposed
  try {
    const activity = await db.activityLog.findMany({ where: { userId: id } })
    res.json({ user, avatar, activity })
  } catch (err) {
    res.status(500).json({ error: err })
  }
}

export async function updateUserRole(req: Request, res: Response) {
  const { id } = req.params
  const { role } = req.body

  // Bug 5: no input validation — any value accepted for role
  await db.users.update({ where: { id }, data: { role } })
  res.json({ message: 'Role updated' })
}
