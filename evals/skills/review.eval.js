/**
 * Eval: /review skill
 *
 * Tests that Claude, given the /review skill prompt + a file with known bugs,
 * identifies the critical issues with correct severity and actionable fixes.
 *
 * Run: node evals/skills/review.eval.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { judge } from '../utils/llm-judge.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dir, '../..')

const client = new Anthropic()

function loadSkill(name) {
  return fs.readFileSync(path.join(REPO_ROOT, 'skills', name, 'SKILL.md'), 'utf8')
}

function loadFixture(relativePath) {
  return fs.readFileSync(path.join(__dir, '..', 'fixtures', relativePath), 'utf8')
}

async function runReviewEval() {
  const skillPrompt = loadSkill('review')
  const codeFile = loadFixture('buggy-code/user-controller.ts')

  const userMessage = `${skillPrompt}

---

Review this file: \`src/controllers/user-controller.ts\`

\`\`\`typescript
${codeFile}
\`\`\`

Perform a thorough code review now.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: userMessage }],
  })

  const output = response.content[0].type === 'text' ? response.content[0].text : ''

  const rubric = [
    {
      criterion: 'Identifies the SQL injection vulnerability (raw string interpolation in query)',
    },
    {
      criterion: 'Identifies the missing null check (user.profile.avatar crashes when profile is null)',
    },
    {
      criterion: 'Identifies the sensitive data exposure in the error handler (err object returned directly)',
    },
    {
      criterion: 'Identifies the missing authorization check (any user can read any other user\'s data)',
    },
    {
      criterion: 'Categorizes the SQL injection and missing auth check as Critical (🔴) severity',
    },
    {
      criterion: 'Provides a concrete fix or code suggestion, not just a description of the problem',
    },
    {
      criterion: 'References specific line numbers or code snippets from the file as evidence',
    },
  ]

  const result = await judge({
    output,
    rubric,
    context: 'The file reviewed is user-controller.ts which contains SQL injection, null crash, missing auth, and error exposure bugs.',
  })

  return { name: 'review: user-controller.ts', output, ...result }
}

export async function runAll() {
  console.log('\n📋 Eval: /review skill\n')

  process.stdout.write('  Running: review buggy user-controller...')
  const r = await runReviewEval()
  const status = r.passed ? '✅ PASS' : '❌ FAIL'
  console.log(` ${status} (${Math.round(r.score * 100)}%)`)

  if (!r.passed) {
    console.log(`\n  Output snippet:\n${r.output.slice(0, 400)}\n`)
    for (const d of r.details.filter(d => !d.passed)) {
      console.log(`    ✗ ${d.criterion}: ${d.note}`)
    }
  }

  console.log(`\n  Result: ${r.passed ? 1 : 0}/1 passed\n`)
  return [r]
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAll().catch(console.error)
}
