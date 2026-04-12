/**
 * Eval: /commit skill
 *
 * Tests that Claude, given the /commit skill prompt + a known diff,
 * produces a message following Conventional Commits format.
 *
 * Run: node evals/skills/commit.eval.js
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

const CONVENTIONAL_COMMIT_TYPES = ['feat', 'fix', 'refactor', 'chore', 'docs', 'test', 'style']

async function runCommitEval(name, diffContent, expectedType) {
  const skillPrompt = loadSkill('commit')

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

  const rubric = [
    {
      criterion: `Starts with a valid Conventional Commits type (${CONVENTIONAL_COMMIT_TYPES.join('/')}) followed by a colon`,
    },
    {
      criterion: 'The first line (subject) is 72 characters or fewer',
    },
    {
      criterion: 'The subject line uses the imperative mood (e.g., "add", "fix", "update") not past tense',
    },
    {
      criterion: `The commit type matches the nature of the change — expected type is "${expectedType}"`,
    },
    {
      criterion: 'The message accurately describes what the diff actually changes, not something generic',
    },
  ]

  const result = await judge({
    output,
    rubric,
    context: `The diff being committed:\n${diffContent}`,
  })

  return { name, output, ...result }
}

export async function runAll() {
  console.log('\n📋 Eval: /commit skill\n')

  const cases = [
    {
      name: 'feat: login form diff',
      diff: loadFixture('sample-diffs/feat-login-form.diff'),
      expectedType: 'feat',
    },
    {
      name: 'fix: null check diff',
      diff: loadFixture('sample-diffs/fix-null-check.diff'),
      expectedType: 'fix',
    },
  ]

  const results = []

  for (const tc of cases) {
    process.stdout.write(`  Running: ${tc.name}...`)
    const r = await runCommitEval(tc.name, tc.diff, tc.expectedType)
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
