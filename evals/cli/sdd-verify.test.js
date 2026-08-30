/**
 * Tests for the SDD side of the verifier — specs/<slug>/tasks.md support,
 * the tasks-over-plan preference, --final, and the .ak/config.md command
 * contract.
 *
 * Same discipline as plan-verify.test.js: every case runs the real command
 * through a real shell against a real file on disk. `true` and `false` stand
 * in for a passing and a failing verification.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { findPlans, parseConfigCommands, runVerify } from '../../bin/plan-verify.js'

let root

function write(rel, body) {
  const file = path.join(root, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, body)
  return file
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

const PLAN = `# Plan: demo

Status: approved

## Steps
- [ ] 1. First step
      Verify: \`true\`
- [ ] 2. Second step
      Verify: \`true\`
`

// Shaped like sdd-creator's templates/tasks.md: one-line tasks with a TDD
// emoji and metadata, plus the Verify line this kit's engine consumes.
const TASKS = `# Tasks — Demo Feature

## Phase 1 — Module votes

### Feature: The user can toggle a vote

- [ ] 🔴 **Test: vote toggle** — files: \`tests/votes/toggle.test.ts\`. Criterion: \`spec.md §3 → "The user can toggle"\`. Must FAIL when run.
      Verify: \`true\`
- [ ] 🟢 **Implement toggle** — files: \`src/votes/service.ts\`. Makes the red test pass.
      Verify: \`true\`
- [ ] 🔵 **Refactor** — files: \`src/votes/service.ts\`. Only if it improves clarity.
`

const CONFIG = `# Project config — read by /ak: skills

## Repo
- Default branch: main

## Commands
- Install: npm ci
- Test: true
- Lint: true
- Typecheck: unknown — no script found
- Build: \`true\`
- E2E: true

## Conventions
- Commits: Conventional Commits
`

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'aksdd-'))
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

// ─── Discovery: which file gets executed ─────────────────────────────────────

describe('findPlans with tasks.md', () => {
  it('scenario A: a plan-only slug keeps the plan flow', () => {
    write('specs/foo/plan.md', PLAN)
    expect(findPlans(root)).toMatchObject([{ slug: 'foo', kind: 'plan' }])
  })

  it('scenario B: an SDD slug prefers tasks.md over plan.md', () => {
    write('specs/foo/spec.md', '# Spec')
    write('specs/foo/plan.md', PLAN)
    write('specs/foo/tasks.md', TASKS)
    const [hit] = findPlans(root)
    expect(hit.kind).toBe('tasks')
    expect(hit.file.endsWith('tasks.md')).toBe(true)
  })

  it('--plan flips the preference back to plan.md', () => {
    write('specs/foo/plan.md', PLAN)
    write('specs/foo/tasks.md', TASKS)
    expect(findPlans(root, { preferPlan: true })[0].kind).toBe('plan')
  })

  it('sees a slug that has only tasks.md', () => {
    write('specs/foo/tasks.md', TASKS)
    expect(findPlans(root)).toMatchObject([{ slug: 'foo', kind: 'tasks' }])
  })

  it('still ignores a spec directory with neither file', () => {
    fs.mkdirSync(path.join(root, 'specs', 'empty'), { recursive: true })
    expect(findPlans(root)).toEqual([])
  })

  it('ignores stray files directly under specs/', () => {
    write('specs/INDEX.md', '# Index')
    write('specs/foo/tasks.md', TASKS)
    expect(findPlans(root).map(p => p.slug)).toEqual(['foo'])
  })
})

// ─── Running tasks.md ────────────────────────────────────────────────────────

describe('runVerify on tasks.md', () => {
  it('scenario D: ticks a task whose Verify exits 0', async () => {
    write('specs/foo/spec.md', '# Spec')
    write('specs/foo/tasks.md', TASKS)
    const code = await runVerify(['foo', '--yes'], { root })
    expect(code).toBe(0)
    expect(read('specs/foo/tasks.md')).toContain('- [x] 🔴 **Test: vote toggle**')
    expect(read('specs/foo/tasks.md')).toContain('- [ ] 🟢 **Implement toggle**')
  })

  it('scenario C: leaves the box unticked when Verify fails', async () => {
    write('specs/foo/tasks.md', TASKS.replace('Verify: `true`', 'Verify: `false`'))
    const code = await runVerify(['foo', '--yes'], { root })
    expect(code).toBe(1)
    expect(read('specs/foo/tasks.md')).not.toContain('- [x]')
  })

  it('scenario B: runs tasks.md even when plan.md coexists', async () => {
    write('specs/foo/plan.md', PLAN)
    write('specs/foo/tasks.md', TASKS)
    await runVerify(['foo', '--yes'], { root })
    expect(read('specs/foo/tasks.md')).toContain('- [x]')
    expect(read('specs/foo/plan.md')).not.toContain('- [x]')
  })

  it('--plan targets plan.md when both exist', async () => {
    write('specs/foo/plan.md', PLAN)
    write('specs/foo/tasks.md', TASKS)
    await runVerify(['foo', '--plan', '--yes'], { root })
    expect(read('specs/foo/plan.md')).toContain('- [x]')
    expect(read('specs/foo/tasks.md')).not.toContain('- [x]')
  })

  it('scenario E: --recheck reports a regression on a ticked task', async () => {
    write('specs/foo/tasks.md', '# Tasks\n- [x] 🟢 **Implement toggle**\n      Verify: `false`\n')
    const code = await runVerify(['foo', '--recheck', '--yes'], { root })
    expect(code).toBe(1)
    expect(read('specs/foo/tasks.md')).toContain('- [x]')
  })

  it('a task without Verify is unverifiable, not tickable', async () => {
    write('specs/foo/tasks.md', '# Tasks\n- [ ] ⚙️ **Create folder structure** — Test: N/A.\n')
    const code = await runVerify(['foo', '--yes'], { root })
    expect(code).toBe(1)
    expect(read('specs/foo/tasks.md')).not.toContain('- [x]')
  })

  it('accepts the -y short flag without eating it as a slug', async () => {
    write('specs/foo/tasks.md', TASKS)
    const code = await runVerify(['-y'], { root })
    expect(code).toBe(0)
    expect(read('specs/foo/tasks.md')).toContain('- [x]')
  })
})

// ─── .ak/config.md parsing ───────────────────────────────────────────────────

describe('parseConfigCommands', () => {
  it('reads the known keys from ## Commands in order', () => {
    write('.ak/config.md', CONFIG)
    expect(parseConfigCommands(root)).toEqual([
      { key: 'Test', command: 'true' },
      { key: 'Lint', command: 'true' },
      { key: 'Build', command: 'true' },
      { key: 'E2E', command: 'true' },
    ])
  })

  it('skips unknown — values and unrelated keys', () => {
    write('.ak/config.md', CONFIG)
    const keys = parseConfigCommands(root).map(c => c.key)
    expect(keys).not.toContain('Typecheck') // unknown — no script found
    expect(keys).not.toContain('Install')   // not a --final check
  })

  it('ignores bullets outside the Commands section', () => {
    write('.ak/config.md', '## Repo\n- Test: not a command\n## Layout\n- Source: src/')
    expect(parseConfigCommands(root)).toEqual([])
  })

  it('returns nothing when there is no config file', () => {
    expect(parseConfigCommands(root)).toEqual([])
  })
})

// ─── Final verification ──────────────────────────────────────────────────────

describe('runVerify --final', () => {
  const DONE_TASKS = `# Tasks
- [x] 🔴 **Test: toggle**
      Verify: \`true\`
- [x] 🟢 **Implement toggle**
      Verify: \`true\`
`

  it('passes when every task Verify and every global check exits 0', async () => {
    write('specs/foo/tasks.md', DONE_TASKS)
    write('.ak/config.md', CONFIG)
    expect(await runVerify(['foo', '--final', '--yes'], { root })).toBe(0)
  })

  it('fails on a regression in a ticked task', async () => {
    write('specs/foo/tasks.md', DONE_TASKS.replace('Verify: `true`', 'Verify: `false`'))
    write('.ak/config.md', CONFIG)
    expect(await runVerify(['foo', '--final', '--yes'], { root })).toBe(1)
  })

  it('fails when a global check from .ak/config.md fails', async () => {
    write('specs/foo/tasks.md', DONE_TASKS)
    write('.ak/config.md', CONFIG.replace('- Lint: true', '- Lint: false'))
    expect(await runVerify(['foo', '--final', '--yes'], { root })).toBe(1)
  })

  it('fails when an unticked task Verify fails', async () => {
    write('specs/foo/tasks.md', '# Tasks\n- [ ] 🟢 **Never finished**\n      Verify: `false`\n')
    expect(await runVerify(['foo', '--final', '--yes'], { root })).toBe(1)
  })

  it('runs tasks-only when there is no .ak/config.md', async () => {
    write('specs/foo/tasks.md', DONE_TASKS)
    expect(await runVerify(['foo', '--final', '--yes'], { root })).toBe(0)
  })

  it('tolerates unverifiable steps without failing on them', async () => {
    write('specs/foo/tasks.md', DONE_TASKS + '- [ ] ⚙️ **Setup** — Test: N/A.\n')
    expect(await runVerify(['foo', '--final', '--yes'], { root })).toBe(0)
  })

  it('is read-only: no box is ticked and no status is written', async () => {
    const body = '# Tasks\nStatus: in progress\n- [ ] 🟢 **Open task**\n      Verify: `true`\n'
    write('specs/foo/tasks.md', body)
    await runVerify(['foo', '--final', '--yes'], { root })
    expect(read('specs/foo/tasks.md')).toBe(body)
  })

  it('works on a classic plan.md too', async () => {
    write('specs/foo/plan.md', '# Plan\nStatus: done\n## Steps\n- [x] 1. Done\n      Verify: `true`\n')
    expect(await runVerify(['foo', '--final', '--yes'], { root })).toBe(0)
  })

  it('executes nothing on a dry run', async () => {
    write('specs/foo/tasks.md', DONE_TASKS.replace('Verify: `true`', 'Verify: `false`'))
    expect(await runVerify(['foo', '--final', '--dry-run'], { root })).toBe(0)
  })

  it('fails when nothing at all is verifiable', async () => {
    write('specs/foo/tasks.md', '# Tasks\n- [ ] ⚙️ **Setup only**\n')
    expect(await runVerify(['foo', '--final', '--yes'], { root })).toBe(1)
  })
})
