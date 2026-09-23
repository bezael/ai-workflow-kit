/**
 * Eval: /commit skill
 *
 * The rubric and the cases come from `acceptance` in src/skills/commit.md —
 * the same spec the distributions are built from. Nothing about what the
 * skill must do is defined in this file.
 *
 * Run: node evals/skills/commit.eval.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { judge } from '../utils/llm-judge.js'
import { loadSkill as loadSpec, resolveAcceptance, REPO_ROOT } from '../../scripts/lib/spec.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))

const client = new Anthropic()

function loadSkillPrompt(name) {
  return fs.readFileSync(path.join(REPO_ROOT, 'skills', `ak-${name}`, 'SKILL.md'), 'utf8')
}

function loadFixture(relativePath) {
  return fs.readFileSync(path.join(__dir, '..', 'fixtures', relativePath), 'utf8')
}

async function runCommitEval({ name, criteria, context }, diffContent, threshold) {
  const skillPrompt = loadSkillPrompt('commit')

  const userMessage = `${skillPrompt}

---

Here is the staged diff to generate a commit message for:

\`\`\`diff
${diffContent}
\`\`\`

Generate the commit message now.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: userMessage }],
  })

  const output = response.content[0].type === 'text' ? response.content[0].text : ''

  const result = await judge({
    output,
    rubric: criteria.map(criterion => ({ criterion })),
    context: `${context}\n\nThe diff being committed:\n${diffContent}`.trim(),
    threshold,
  })

  return { name, output, ...result }
}

export async function runAll() {
  console.log('\n📋 Eval: /commit skill\n')

  const { spec } = loadSpec('commit')
  const { cases, threshold } = resolveAcceptance(spec)

  const results = []

  for (const tc of cases) {
    process.stdout.write(`  Running: ${tc.name}...`)
    const r = await runCommitEval(tc, loadFixture(tc.fixture), threshold)
    const status = r.passed ? '✅ PASS' : '❌ FAIL'
    console.log(` ${status} (${Math.round(r.score * 100)}%)`)

    if (!r.passed) {
      console.log(`  Output: ${r.output.slice(0, 200)}`)
      for (const d of r.details.filter(d => !d.passed)) {
        console.log(`    ✗ ${d.criterion}: ${d.note}`)
      }
    }

    results.push(r)
  }

  const passed = results.filter(r => r.passed).length
  console.log(`\n  Result: ${passed}/${results.length} passed\n`)
  return results
}

// Run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAll().catch(console.error)
}
