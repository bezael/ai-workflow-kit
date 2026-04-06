// FIXTURE: Purposely vulnerable Express app for /vibe-audit eval
// Contains: hardcoded secrets, open CORS, no auth on admin routes,
// no input validation, plain-text password storage, XSS via innerHTML,
// no pagination, stack trace exposure, JWT without expiration, no helmet

import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'

const app = express()
app.use(express.json())

// 🔴 Problem 1: CORS open to everyone
app.use(cors())

// 🔴 Problem 1 (also): Hardcoded secrets
const DB_PASSWORD = 'admin123'
const JWT_SECRET = 'mysecretkey'
const OPENAI_API_KEY = 'sk-abcdefghijklmnopqrstuvwxyz1234567890abcdef'

// 🟡 Problem: console.log with sensitive data
console.log('DB_PASSWORD:', DB_PASSWORD)

// Fake DB
const users = []
const orders = []

// ─── AUTH ──────────────────────────────────────────────────────────────────

app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body
  // 🔴 Problem: no input validation
  // 🔴 Problem: password stored in plain text
  users.push({ id: users.length + 1, email, password, role: 'user' })
  res.json({ message: 'Registered' })
})

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body
  const user = users.find(u => u.email === email && u.password === password)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  // 🔴 Problem: JWT without expiration
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET)
  res.json({ token })
})

// ─── ADMIN ROUTES (no auth middleware) ─────────────────────────────────────

// 🔴 Problem: no authentication on /admin routes
app.get('/admin/users', (req, res) => {
  res.json(users)
})

app.delete('/admin/users/:id', (req, res) => {
  const idx = users.findIndex(u => u.id === Number(req.params.id))
  users.splice(idx, 1)
  res.json({ message: 'Deleted' })
})

// ─── ORDERS ────────────────────────────────────────────────────────────────

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const decoded = jwt.verify(token, JWT_SECRET)
  req.user = decoded
  next()
}

// 🔴 Problem: IDOR — no ownership check
app.get('/api/orders/:id', authenticate, async (req, res) => {
  const order = orders.find(o => o.id === Number(req.params.id))
  res.json(order)
})

// 🟡 Problem: no pagination
app.get('/api/orders', authenticate, async (req, res) => {
  res.json(orders)
})

// ─── AI ENDPOINT (no rate limiting) ────────────────────────────────────────

// 🟡 Problem: third-party API with no rate limiting
app.post('/api/generate', authenticate, async (req, res) => {
  const { prompt } = req.body
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await response.json()
  res.json(data)
})

// ─── ERROR HANDLER ─────────────────────────────────────────────────────────

// 🔴 Problem: stack trace exposed to client
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack })
})

app.listen(3000)
