# The 20 typical vibe coding problems

Reference for `/ak:vibe-audit`. For each pattern: what to look for, the risk, and the fix.

---

## 🔴 Critical

### 1. Hardcoded secrets

AI tends to put API keys, passwords, and database URLs directly in code because "it works faster".

**Look for:**
```
OPENAI_API_KEY = "sk-..."
password: "admin123"
mongodb://user:pass@host
const SECRET = "abc123"
```

**Fix:** Move to `.env`, add `.env` to `.gitignore`, create `.env.example` with names but no values.

---

### 2. No input validation on APIs

AI generates endpoints that blindly trust `req.body`. Any user can send whatever they want.

**Look for:**
```js
const { email, role } = req.body
await db.users.update({ role })  // a user can give themselves admin role
```

**Fix:** Validate with Zod/Joi before using any request data. Never trust the client.

---

### 3. CORS open to everyone

To "make it work in development" AI puts `origin: '*'` and it stays that way in production.

**Look for:**
```js
cors({ origin: '*' })
app.use(cors())  // no config = everything allowed
```

**Fix:** Whitelist of allowed domains. In development: `localhost:port`. In production: only the real domain.

---

### 4. No authentication on protected routes

AI generates the routes but "forgets" to put the auth middleware on all of them.

**Look for:** Routes to `/admin`, `/dashboard`, `/users`, `/settings` without `authenticate` or equivalent before the handler.

**Fix:** Check every sensitive route. In Express: `router.use(authenticate)` before protected routes, not on each one individually.

---

### 12. IDOR — Access to other users' resources

AI generates endpoints like `GET /api/orders/:id` or `DELETE /api/posts/:id` without verifying the resource belongs to the logged-in user. Any authenticated user can access or delete other people's data by changing the ID in the URL.

**Look for:**
```js
// Without ownership check — any userId can access
app.get('/api/orders/:id', authenticate, async (req, res) => {
  const order = await db.orders.findById(req.params.id)
  res.json(order)
})
```

**Risk:** Private data exposure, deletion of others' content, privilege escalation.

**Fix:**
```js
app.get('/api/orders/:id', authenticate, async (req, res) => {
  const order = await db.orders.findById(req.params.id)

  if (!order) return res.status(404).json({ error: 'Not found' })

  // Verify the resource belongs to the authenticated user
  if (order.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.json(order)
})
```

**Pattern to detect it:** find all endpoints with `req.params.id` and verify each one compares that ID against `req.user.id` before returning data.

---

### 13. Passwords without hashing

AI sometimes saves the password as-is from the form, especially if the prompt was vague or quick.

**Look for:**
```js
// Password stored in plain text
await db.users.create({ email, password: req.body.password })

// Or weak hash (MD5, SHA1 — not suitable for passwords)
const hashed = crypto.createHash('md5').update(password).digest('hex')
```

**Fix:** bcrypt or argon2 — never MD5/SHA1 for passwords.
```js
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12
const hashedPassword = await bcrypt.hash(req.body.password, SALT_ROUNDS)
await db.users.create({ email, password: hashedPassword })

// When verifying login:
const isValid = await bcrypt.compare(req.body.password, user.password)
```

---

### 14. XSS via innerHTML / dangerouslySetInnerHTML

AI uses innerHTML or dangerouslySetInnerHTML to render dynamic content without sanitizing. An attacker can inject scripts that steal sessions or redirect users.

**Look for:**
```js
// React — dangerous without sanitization
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// Vanilla JS
element.innerHTML = userData
document.write(userInput)
```

**Fix:** Sanitize before rendering with DOMPurify, or better yet, avoid innerHTML and use textContent or framework abstractions.
```js
import DOMPurify from 'dompurify'

// Only if you NEED to render HTML (e.g.: rich text editor)
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />

// For plain text: never innerHTML, always textContent
element.textContent = userData  // automatically safe
```

---

### 15. JWT without expiration

`jwt.sign(payload, secret)` without `expiresIn` generates tokens valid forever. If a token leaks (logs, compromised localStorage), the attacker has permanent access.

**Look for:**
```js
// Without expiresIn — eternal token
const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET)

// expiresIn very long — almost as bad
const token = jwt.sign(payload, secret, { expiresIn: '365d' })
```

**Fix:**
```js
// Short access token + refresh token to renew
const accessToken = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }   // short — if leaked, expires soon
)

const refreshToken = jwt.sign(
  { userId: user.id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }    // longer but stored securely (httpOnly cookie)
)
```

---

### 16. Stack traces exposed to client

AI puts `res.json({ error: err.message })` or worse `res.json({ error: err.stack })` in the error handler. In production this exposes internal paths, library versions, and app logic.

**Look for:**
```js
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message })  // exposes internals
  res.status(500).json({ error: err.stack })    // even worse
})

// Also in inline try/catch
} catch (err) {
  res.status(500).json({ error: err.toString() })
}
```

**Fix:** Log the internal error, return generic message to client.
```js
app.use((err, req, res, next) => {
  // Internal log with all details (server only sees this)
  console.error('[ERROR]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  })

  // Generic response to client — no internal information
  const statusCode = err.statusCode ?? 500
  res.status(statusCode).json({
    error: statusCode < 500 ? err.message : 'Internal server error',
  })
})
```

---

## 🟡 Important

### 5. Development console.logs in production

AI logs everything for debugging. Those logs expose internal data and pollute production logs.

**Look for:**
```js
console.log('user data:', user)
console.log('db response:', result)
console.log('DEBUG:', req.body)
```

**Fix:** Remove or replace with a real logger (Winston, Pino) that respects log level based on environment.

---

### 6. Giant components (God Components)

AI puts everything in one component: state, API calls, UI, business logic. 500-1000 lines is common.

**Look for:** Components over 200 lines, components with 5+ `useState`, mixing fetch + render in the same place.

**Fix:** Separate into: custom hooks (logic), child components (UI), services (API calls).

---

### 7. No loading or error states in frontend

AI generates the perfect "happy path". But if the API is slow or fails, the app goes blank or crashes silently.

**Look for:** Fetches without `isLoading`, without `error`, without fallback UI. Components that render data without checking it exists.

**Fix:** Every fetch needs 3 states: loading, error, success. Error boundaries in React to catch crashes.

---

### 8. Queries without pagination

AI generates `SELECT * FROM table` or `db.find({})` without a limit. Works in development with 10 records. Explodes in production with 10,000.

**Look for:**
```js
const users = await db.users.findMany()  // without take/limit
const items = await db.collection.find({}).toArray()
```

**Fix:** Every query returning lists needs `LIMIT`/`take` and pagination or cursor.

---

### 9. Third-party APIs without rate limiting

AI connects the app to OpenAI, Stripe, Twilio, or any external API and calls directly with no control. In production, any user (or bot) can fire thousands of calls and ruin the bill or get the account banned by the provider.

**First detect if there's external API consumption:**
```js
fetch('https://api.openai.com')
openai.chat.completions.create(...)
stripe.charges.create(...)
axios.get('https://api.external.com')
```

**Typical problem:**
```js
// A user can click infinitely and generate costs
app.post('/generate', async (req, res) => {
  const result = await openai.chat.completions.create({ ... })  // no limit
  res.json(result)
})
```

**Fix — server level (Express):**
```js
import rateLimit from 'express-rate-limit'

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,    // 1 minute window
  max: 10,                 // max 10 requests per IP per minute
  message: { error: 'Too many requests, try again in a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/generate', aiLimiter)
```

**Fix — per authenticated user:**
```js
const userRequestCounts = new Map()

function userRateLimit(maxPerMinute: number) {
  return (req, res, next) => {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Not authenticated' })

    const key = `${userId}:${Math.floor(Date.now() / 60000)}`
    const count = (userRequestCounts.get(key) ?? 0) + 1
    userRequestCounts.set(key, count)

    if (count > maxPerMinute) {
      return res.status(429).json({ error: 'Usage limit reached' })
    }
    next()
  }
}
```

**Fix — frontend (prevents button spam):**
```ts
const [isLoading, setIsLoading] = useState(false)

async function handleGenerate() {
  if (isLoading) return
  setIsLoading(true)
  try {
    await callExpensiveAPI()
  } finally {
    setIsLoading(false)
  }
}

<button onClick={handleGenerate} disabled={isLoading}>
  {isLoading ? 'Generating...' : 'Generate'}
</button>
```

**Additional warning signs:**
- App calls the API on every keystroke (missing debounce)
- No cache: the same query called multiple times without saving the result
- No timeout configured in the fetch

**Fix for basic cache:**
```js
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000  // 5 minutes

async function getCachedResult(key: string, fn: () => Promise<any>) {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  const data = await fn()
  cache.set(key, { data, timestamp: Date.now() })
  return data
}
```

---

### 17. No security headers (Helmet)

Without security headers the browser doesn't activate basic protections: clickjacking, XSS, wrong MIME type interpretation.

**Look for:** Express app without `helmet()` in the middleware stack.
```js
const app = express()
app.use(express.json())
app.use(cors(...))
// ← missing helmet
```

**Fix:**
```js
import helmet from 'helmet'

app.use(helmet())  // activates 15 security headers with sensible defaults

// If you need custom CSP:
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'cdn.yourdomain.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  })
)
```

---

### 18. Dependencies with known vulnerabilities

AI installs packages without checking their security status.

**How to verify:**
```bash
npm audit
npm audit --audit-level=high
```

**Warning signs:**
- Packages with very old versions
- Abandoned dependencies (last commit 3+ years ago)
- `npm audit` with `critical: N` > 0

**Fix:**
```bash
npm audit fix
npx npm-check-updates
npm install express@latest
```

**For CI — block merges if there are critical vulnerabilities:**
```yaml
- name: Security audit
  run: npm audit --audit-level=critical
```

---

### 19. node_modules or /dist committed

AI doesn't always configure `.gitignore` properly.

**Look for:**
```bash
git ls-files | grep -E "^node_modules/|^dist/|^build/|^\.next/"
```

**Fix:**
```bash
git rm -r --cached node_modules/
git rm -r --cached dist/

echo "node_modules/" >> .gitignore
echo "dist/" >> .gitignore
echo ".next/" >> .gitignore

git add .gitignore
git commit -m "chore: remove node_modules and dist from tracking"
```

**Minimal .gitignore for JS/TS projects:**
```
node_modules/
dist/
build/
.next/
.nuxt/
.env
.env.local
.env.*.local
*.log
.DS_Store
coverage/
```

---

## 🔵 Improvements

### 10. No environment variables for configuration

Ports, service URLs, database names hardcoded. Impossible to deploy to another environment without touching the code.

**Look for:**
```js
const PORT = 3000
const DB_NAME = "myapp_dev"
const API_URL = "http://localhost:8080"
```

**Fix:** Everything that changes between environments (dev/staging/prod) goes in `.env`.

---

### 11. No async error handling

AI generates `async/await` without `try/catch`. An uncaught error crashes the process in Node.js.

**Look for:**
```js
async function getData() {
  const result = await fetch(url)  // what happens if it fails?
  return result.json()
}
```

**Fix:** Async wrapper for Express, error boundaries for React, explicit handling in each critical async function.

---

### 20. Unoptimized bundle

AI generates apps that work but aren't optimized for production: all code in one chunk, uncompressed images, heavy dependencies imported completely.

**Warning signs:**
```bash
npx vite-bundle-analyzer     # for Vite
npx webpack-bundle-analyzer  # for Webpack/CRA
npx @next/bundle-analyzer    # for Next.js
```

**Typical AI problems:**
```js
// Full import of heavy library (imports ALL lodash — 70KB)
import _ from 'lodash'

// Fix: specific import (only the function you use — 2KB)
import groupBy from 'lodash/groupBy'
```

```js
// Without lazy loading — everything loads on first render
import HeavyDashboard from './HeavyDashboard'

// Fix: lazy loading by route
const HeavyDashboard = lazy(() => import('./HeavyDashboard'))
```

**Production targets (Lighthouse):**
- Initial JS bundle: < 300KB gzipped
- LCP (Largest Contentful Paint): ≤ 2.5s
- INP (Interaction to Next Paint): ≤ 200ms

**Quick fix for images:**
```jsx
// In Next.js — use <Image> instead of <img>
import Image from 'next/image'
<Image src="/hero.png" width={800} height={400} alt="..." priority />
```
