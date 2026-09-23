/**
 * Eval: /vibe-audit skill
 *
 * The rubric comes from `acceptance` in src/skills/vibe-audit.md — the same
 * spec the distributions are built from. The planted problems in the fixture
 * and the criteria here are meant to stay in lockstep; changing one without
 * the other is what this arrangement prevents.
 *
 * Run: node evals/skills/vibe-audit.eval.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { judge } from '../utils/llm-judge.js'
import { loadSkill as loadSpec, resolveAcceptance, REPO_ROOT } from '../../scripts/lib/spec.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.join(__dir, '..', 'fixtures', 'vulnerable-app')

const client = new Anthropic()

function loadSkillPrompt(name) {
  return fs.readFileSync(path.join(REPO_ROOT, 'skills', `ak-${name}`, 'SKILL.md'), 'utf8')
}

async function runVibeAuditEval() {
  const { spec } = loadSpec('vibe-audit')
  const { cases, threshold } = resolveAcceptance(spec)
  const [testCase] = cases

  const skillPrompt = loadSkillPrompt('vibe-audit')
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
  const result = await judge({
    output,
    rubric: testCase.criteria.map(criterion => ({ criterion })),
    context: testCase.context,
    threshold,
  })

  return { name: `vibe-audit: ${testCase.name}`, output, ...result }
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
