/**
 * Eval: /review skill
 *
 * The rubric is NOT defined here — it comes from `acceptance` in
 * src/skills/review.md, the same spec the distributions are built from.
 * Changing what the skill must do means changing the spec, and both the
 * prompt and this eval follow.
 *
 * Run: node evals/skills/review.eval.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { judge } from '../utils/llm-judge.js'
import { loadSkill as loadSpec, REPO_ROOT } from '../../scripts/lib/spec.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))

const client = new Anthropic()

function loadSkillPrompt(name) {
  return fs.readFileSync(path.join(REPO_ROOT, 'skills', name, 'SKILL.md'), 'utf8')
}

function loadFixture(relativePath) {
  return fs.readFileSync(path.join(__dir, '..', 'fixtures', relativePath), 'utf8')
}

async function runReviewEval() {
  const { spec } = loadSpec('review')
  const { criteria, threshold, fixture, context } = spec.acceptance

  const skillPrompt = loadSkillPrompt('review')
  const codeFile = loadFixture(fixture)

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

  const result = await judge({
    output,
    rubric: criteria.map(criterion => ({ criterion })),
    context,
    threshold,
  })

  return { name: `review: ${fixture}`, output, ...result }
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
