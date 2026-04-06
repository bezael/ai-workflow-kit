/**
 * run-evals.js
 * Runs all LLM skill evals sequentially and prints a summary.
 *
 * Usage:
 *   node evals/run-evals.js
 *   VERBOSE=1 node evals/run-evals.js   # show full output for each eval
 *
 * Requires: ANTHROPIC_API_KEY env var
 */

import { runAll as runCommit } from './skills/commit.eval.js'
import { runAll as runReview } from './skills/review.eval.js'
import { runAll as runVibeAudit } from './skills/vibe-audit.eval.js'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\n❌ ANTHROPIC_API_KEY is not set. Skill evals require the Anthropic API.\n')
  process.exit(1)
}

console.log('\n╔══════════════════════════════════════╗')
console.log('║   AI Workflow Kit — Skill Evals      ║')
console.log('╚══════════════════════════════════════╝')

const suites = [
  { name: 'commit', fn: runCommit },
  { name: 'review', fn: runReview },
  { name: 'vibe-audit', fn: runVibeAudit },
]

let totalPassed = 0
let totalRan = 0

for (const suite of suites) {
  try {
    const results = await suite.fn()
    const passed = results.filter(r => r.passed).length
    totalPassed += passed
    totalRan += results.length
  } catch (err) {
    console.error(`\n❌ Suite "${suite.name}" threw an error:`, err.message)
    totalRan += 1
  }
}

console.log('════════════════════════════════════════')
console.log(`  Total: ${totalPassed}/${totalRan} evals passed`)
console.log('════════════════════════════════════════\n')

process.exit(totalPassed === totalRan ? 0 : 1)
