/**
 * run-evals.js
 * Runs all LLM skill evals sequentially and prints a summary.
 *
 * Usage:
 *   node evals/run-evals.js
 *   VERBOSE=1 node evals/run-evals.js   # show full output for each eval
 *
 * Requires: ANTHROPIC_API_KEY — set in .env or as an environment variable
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Load .env from project root if present (works on Node 18+, no extra deps)
const envPath = resolve(process.cwd(), '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([^#\s][^=]*)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^(['"])(.*)\1$/, '$2')
      process.env[key] ??= value  // don't override vars already set in the shell
    }
  }
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\n❌ ANTHROPIC_API_KEY is not set.')
  console.error('   Add it to a .env file in the project root:')
  console.error('   ANTHROPIC_API_KEY=sk-ant-...\n')
  process.exit(1)
}

console.log('\n╔══════════════════════════════════════╗')
console.log('║   AI Workflow Kit — Skill Evals      ║')
console.log('╚══════════════════════════════════════╝')

// Dynamic imports so they load AFTER process.env is populated above
const { runAll: runCommit }     = await import('./skills/commit.eval.js')
const { runAll: runReview }     = await import('./skills/review.eval.js')
const { runAll: runVibeAudit }  = await import('./skills/vibe-audit.eval.js')

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
