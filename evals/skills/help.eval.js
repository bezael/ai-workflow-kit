/**
 * Eval: /help skill
 *
 * The rubric and the cases come from `acceptance` in src/skills/help.md —
 * the same spec the distributions are built from.
 *
 * This is the one skill whose cases need no fixture: the input is a sentence
 * describing a task, and the output is a routing decision. The fourth case is
 * the one that matters — a router that always finds a match is a router that
 * sends people to the wrong place.
 *
 * Run: node evals/skills/help.eval.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { judge } from '../utils/llm-judge.js'
import { loadSkill as loadSpec, resolveAcceptance, REPO_ROOT } from '../../scripts/lib/spec.js'

const client = new Anthropic()

function loadSkillPrompt(name) {
  return fs.readFileSync(path.join(REPO_ROOT, 'skills', `ak-${name}`, 'SKILL.md'), 'utf8')
}

async function runHelpEval({ name, criteria, context, input }, threshold) {
  // The distribution leaves `$ARGUMENTS` in place for the harness to fill;
  // here the harness is this file.
  const skillPrompt = loadSkillPrompt('help').replace('$ARGUMENTS', input)

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: skillPrompt }],
  })

  const output = response.content.map(b => (b.type === 'text' ? b.text : '')).join('')

  const result = await judge({
    output,
    rubric: criteria.map(criterion => ({ criterion })),
    context: `${context}\n\nThe user asked: ${input}`.trim(),
    threshold,
  })

  return { name, output, ...result }
}

export async function runAll() {
  console.log('\n📋 Eval: /help skill\n')

  const { spec } = loadSpec('help')
  const { cases, threshold } = resolveAcceptance(spec)

  const results = []

  for (const tc of cases) {
    process.stdout.write(`  Running: ${tc.name}...`)
    const r = await runHelpEval(tc, threshold)
    console.log(` ${r.passed ? '✅ PASS' : '❌ FAIL'} (${Math.round(r.score * 100)}%)`)

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
