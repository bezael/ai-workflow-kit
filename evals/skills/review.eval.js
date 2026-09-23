/**
 * Eval: /review skill
 *
 * The rubric is NOT defined here — it comes from `acceptance` in
 * src/skills/review.md, the same spec the distributions are built from.
 * Changing what the skill must do means changing the spec, and both the
 * prompt and this eval follow.
 *
 * A case's fixture may be a single file (reviewed as that file) or a
 * directory (reviewed as a small working tree — every file embedded except
 * PLANTED_PROBLEMS.md, which is the judge's answer key, never the model's).
 *
 * Run: node evals/skills/review.eval.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { judge } from '../utils/llm-judge.js'
import { loadSkill as loadSpec, resolveAcceptance, REPO_ROOT } from '../../scripts/lib/spec.js'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.join(__dir, '..', 'fixtures')

const client = new Anthropic()

function loadSkillPrompt(name) {
  return fs.readFileSync(path.join(REPO_ROOT, 'skills', `ak-${name}`, 'SKILL.md'), 'utf8')
}

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return listFiles(full, base)
    return [path.relative(base, full).replaceAll('\\', '/')]
  })
}

/** Render a fixture (file or directory) as the review request. */
function renderTarget(fixture) {
  const full = path.join(FIXTURES_DIR, fixture)

  if (fs.statSync(full).isFile()) {
    return `Review this file: \`${fixture}\`

\`\`\`
${fs.readFileSync(full, 'utf8')}
\`\`\``
  }

  const files = listFiles(full).filter(f => !f.endsWith('PLANTED_PROBLEMS.md'))
  const blocks = files.map(f =>
    `## ${f}\n\`\`\`\n${fs.readFileSync(path.join(full, f), 'utf8')}\n\`\`\``
  )
  return `Review the changes of this working tree. It contains these files:\n\n${blocks.join('\n\n')}`
}

async function runCase(testCase, threshold) {
  const skillPrompt = loadSkillPrompt('review')

  const userMessage = `${skillPrompt}

---

${renderTarget(testCase.fixture)}

Perform a thorough code review now.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: userMessage }],
  })

  const output = response.content[0].type === 'text' ? response.content[0].text : ''

  const result = await judge({
    output,
    rubric: testCase.criteria.map(criterion => ({ criterion })),
    context: testCase.context,
    threshold,
  })

  return { name: `review: ${testCase.name}`, output, ...result }
}

export async function runAll() {
  console.log('\n📋 Eval: /review skill\n')

  const { spec } = loadSpec('review')
  const { cases, threshold } = resolveAcceptance(spec)

  const results = []
  for (const testCase of cases) {
    process.stdout.write(`  Running: ${testCase.name}...`)
    const r = await runCase(testCase, threshold)
    results.push(r)
    console.log(` ${r.passed ? '✅ PASS' : '❌ FAIL'} (${Math.round(r.score * 100)}%)`)

    if (process.env.VERBOSE || !r.passed) {
      console.log(`\n  Output snippet:\n${r.output.slice(0, 400)}\n`)
      for (const d of r.details.filter(d => !d.passed)) {
        console.log(`    ✗ ${d.criterion}: ${d.note}`)
      }
    }
  }

  const passed = results.filter(r => r.passed).length
  console.log(`\n  Result: ${passed}/${results.length} passed\n`)
  return results
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAll().catch(console.error)
}
