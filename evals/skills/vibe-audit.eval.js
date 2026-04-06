/**
 * Eval: /vibe-audit skill
 *
 * Tests that Claude, given the /vibe-audit skill prompt + a purposely vulnerable app,
 * detects >= 80% of the planted problems.
 *
 * Run: node evals/skills/vibe-audit.eval.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { judge } from '../utils/llm-judge.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dir, '../..')
const FIXTURES_DIR = path.join(__dir, '..', 'fixtures', 'vulnerable-app')

const client = new Anthropic()

function loadSkill(name) {
  return fs.readFileSync(path.join(REPO_ROOT, 'skills', `${name}.md`), 'utf8')
}

async function runVibeAuditEval() {
  const skillPrompt = loadSkill('vibe-audit')
  const serverCode = fs.readFileSync(path.join(FIXTURES_DIR, 'server.js'), 'utf8')
  const frontendCode = fs.readFileSync(path.join(FIXTURES_DIR, 'frontend.jsx'), 'utf8')

  const userMessage = `${skillPrompt}

---

Audit this app. Here are all the files:

## server.js
\`\`\`javascript
${serverCode}
\`\`\`

## frontend.jsx
\`\`\`jsx
${frontendCode}
\`\`\`

Perform a full vibe audit now.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: userMessage }],
  })

  const output = response.content[0].type === 'text' ? response.content[0].text : ''

  // Each criterion matches a planted problem from PLANTED_PROBLEMS.md
  const rubric = [
    { criterion: 'Detects hardcoded secrets (OPENAI_API_KEY or DB_PASSWORD in server.js)' },
    { criterion: 'Detects CORS open to all origins (cors() with no config in server.js)' },
    { criterion: 'Detects missing authentication on /admin routes' },
    { criterion: 'Detects password stored in plain text (no hashing in /auth/register)' },
    { criterion: 'Detects IDOR vulnerability (no ownership check in /api/orders/:id)' },
    { criterion: 'Detects JWT without expiration (jwt.sign without expiresIn)' },
    { criterion: 'Detects stack trace exposed to client in the error handler' },
    { criterion: 'Detects XSS via dangerouslySetInnerHTML in frontend.jsx' },
    { criterion: 'Detects missing rate limiting on the /api/generate OpenAI endpoint' },
    { criterion: 'Uses structured severity format (Critical/Important or 🔴/🟡 categories)' },
    { criterion: 'References specific file names or line numbers as evidence (not vague descriptions)' },
    { criterion: 'Does NOT invent critical problems that are not in the code' },
  ]

  const result = await judge({
    output,
    rubric,
    context: 'The app has these planted problems: hardcoded secrets, open CORS, no admin auth, plain-text passwords, IDOR, JWT without expiry, stack trace exposure, XSS via dangerouslySetInnerHTML, no rate limiting on AI endpoint.',
  })

  return { name: 'vibe-audit: vulnerable-app', output, ...result }
}

export async function runAll() {
  console.log('\n📋 Eval: /vibe-audit skill\n')

  process.stdout.write('  Running: vibe-audit on vulnerable-app...')
  const r = await runVibeAuditEval()
  const status = r.passed ? '✅ PASS' : '❌ FAIL'
  console.log(` ${status} (${Math.round(r.score * 100)}% of rubric)`)

  if (process.env.VERBOSE || !r.passed) {
    console.log(`\n  Output snippet:\n${r.output.slice(0, 600)}\n`)
    console.log('  Criteria breakdown:')
    for (const d of r.details) {
      const icon = d.passed ? '  ✓' : '  ✗'
      console.log(`${icon} ${d.criterion}`)
      if (!d.passed) console.log(`      → ${d.note}`)
    }
  }

  console.log(`\n  Result: ${r.passed ? 1 : 0}/1 passed\n`)
  return [r]
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAll().catch(console.error)
}
