/**
 * Tests for the plan verifier — the loop that turns a plan.md checkbox from a
 * claim into a demonstrated fact.
 *
 * Every case runs the real command through a real shell against a real file on
 * disk. `true` and `false` stand in for a passing and a failing verification,
 * which keeps the tests deterministic without mocking the thing under test.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { parsePlan, tick, setStatus, findPlans, runVerify } from '../../bin/plan-verify.js'

let root

function writePlan(slug, body) {
  const dir = path.join(root, 'specs', slug)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'plan.md'), body)
  return path.join(dir, 'plan.md')
}

function read(slug) {
  return fs.readFileSync(path.join(root, 'specs', slug, 'plan.md'), 'utf8')
}

const PLAN = `# Plan: demo

Status: approved
Updated: 2026-08-14

## Steps
- [ ] 1. First step
      Verify: \`true\`
- [ ] 2. Second step
      Verify: \`false\`
- [ ] 3. Third step
      Verify: \`true\`
`

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'akplan-'))
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

describe('parsePlan', () => {
  it('finds every checkbox with its Verify command', () => {
    const { steps } = parsePlan(PLAN)
    expect(steps).toHaveLength(3)
    expect(steps[0]).toMatchObject({ done: false, title: '1. First step', verify: 'true' })
    expect(steps[1].verify).toBe('false')
  })

  it('marks ticked boxes as done', () => {
    const { steps } = parsePlan('- [x] done\n      Verify: `true`\n- [ ] open\n      Verify: `true`')
    expect(steps.map(s => s.done)).toEqual([true, false])
  })

  it('accepts an upper-case X', () => {
    const { steps } = parsePlan('- [X] done\n      Verify: `true`')
    expect(steps[0].done).toBe(true)
  })

  it('leaves verify null when a step has no command', () => {
    const { steps } = parsePlan('- [ ] no command here')
    expect(steps[0].verify).toBeNull()
  })

  it('does not borrow the Verify of the following step', () => {
    const { steps } = parsePlan('- [ ] one\n- [ ] two\n      Verify: `true`')
    expect(steps[0].verify).toBeNull()
    expect(steps[1].verify).toBe('true')
  })

  it('locates the Status line', () => {
    const { statusLine, lines } = parsePlan(PLAN)
    expect(lines[statusLine]).toBe('Status: approved')
  })
})

describe('tick / setStatus', () => {
  it('ticks only the requested line', () => {
    const { lines, steps } = parsePlan(PLAN)
    const out = tick(lines, steps[0].line).join('\n')
    expect(out).toContain('- [x] 1. First step')
    expect(out).toContain('- [ ] 2. Second step')
  })

  it('rewrites the status in place', () => {
    const { lines, statusLine } = parsePlan(PLAN)
    expect(setStatus(lines, statusLine, 'done').join('\n')).toContain('Status: done')
  })

  it('is a no-op when there is no status line', () => {
    const lines = ['# Plan', '- [ ] a']
    expect(setStatus(lines, -1, 'done')).toEqual(lines)
  })
})

describe('findPlans', () => {
  it('returns nothing when specs/ is absent', () => {
    expect(findPlans(root)).toEqual([])
  })

  it('finds plans sorted by slug', () => {
    writePlan('zebra', PLAN)
    writePlan('alpha', PLAN)
    expect(findPlans(root).map(p => p.slug)).toEqual(['alpha', 'zebra'])
  })

  it('ignores a spec directory with no plan.md', () => {
    fs.mkdirSync(path.join(root, 'specs', 'empty'), { recursive: true })
    expect(findPlans(root)).toEqual([])
  })
})

describe('runVerify', () => {
  it('ticks the first step when its command passes', async () => {
    writePlan('demo', PLAN)
    const code = await runVerify(['demo', '--yes'], { root })
    expect(code).toBe(0)
    expect(read('demo')).toContain('- [x] 1. First step')
    expect(read('demo')).toContain('- [ ] 2. Second step')
  })

  it('sets the status to in progress after a partial run', async () => {
    writePlan('demo', PLAN)
    await runVerify(['demo', '--yes'], { root })
    expect(read('demo')).toContain('Status: in progress')
  })

  it('stops at the failing step and leaves its box unticked', async () => {
    writePlan('demo', PLAN)
    const code = await runVerify(['demo', '--all', '--yes'], { root })
    expect(code).toBe(1)
    const out = read('demo')
    expect(out).toContain('- [x] 1. First step')
    expect(out).toContain('- [ ] 2. Second step')
    expect(out).toContain('- [ ] 3. Third step')  // never reached
  })

  it('marks the plan done once every step passes', async () => {
    writePlan('demo', PLAN.replace('`false`', '`true`'))
    const code = await runVerify(['demo', '--all', '--yes'], { root })
    expect(code).toBe(0)
    expect(read('demo')).toContain('Status: done')
    expect(read('demo')).not.toContain('- [ ]')
  })

  it('refuses to tick a step with no Verify command', async () => {
    writePlan('demo', '# Plan\nStatus: approved\n## Steps\n- [ ] 1. Unprovable\n')
    const code = await runVerify(['demo', '--yes'], { root })
    expect(code).toBe(1)
    expect(read('demo')).toContain('- [ ] 1. Unprovable')
  })

  it('executes nothing on a dry run', async () => {
    writePlan('demo', PLAN)
    const code = await runVerify(['demo', '--all', '--dry-run'], { root })
    expect(code).toBe(0)
    expect(read('demo')).not.toContain('- [x]')
  })

  it('reports a regression without unticking the box', async () => {
    writePlan('demo', '# Plan\nStatus: done\n## Steps\n- [x] 1. Was passing\n      Verify: `false`\n')
    const code = await runVerify(['demo', '--recheck', '--yes'], { root })
    expect(code).toBe(1)
    expect(read('demo')).toContain('- [x] 1. Was passing')
  })

  it('passes a re-check when the ticked steps still hold', async () => {
    writePlan('demo', '# Plan\nStatus: done\n## Steps\n- [x] 1. Fine\n      Verify: `true`\n')
    expect(await runVerify(['demo', '--recheck', '--yes'], { root })).toBe(0)
  })

  it('fails when the named plan does not exist', async () => {
    writePlan('demo', PLAN)
    expect(await runVerify(['nope', '--yes'], { root })).toBe(1)
  })

  it('fails when there is no specs directory at all', async () => {
    expect(await runVerify(['--yes'], { root })).toBe(1)
  })

  it('auto-selects the only plan with work left', async () => {
    writePlan('finished', '# Plan\nStatus: done\n## Steps\n- [x] 1. Done\n      Verify: `true`\n')
    writePlan('open', PLAN)
    expect(await runVerify(['--yes'], { root })).toBe(0)
    expect(read('open')).toContain('- [x] 1. First step')
  })

  it('refuses to guess when several plans have work left', async () => {
    writePlan('one', PLAN)
    writePlan('two', PLAN)
    expect(await runVerify(['--yes'], { root })).toBe(1)
    expect(read('one')).not.toContain('- [x]')
    expect(read('two')).not.toContain('- [x]')
  })

  it('succeeds quietly when every plan is already complete', async () => {
    writePlan('done', '# Plan\nStatus: done\n## Steps\n- [x] 1. Done\n      Verify: `true`\n')
    expect(await runVerify(['--yes'], { root })).toBe(0)
  })
})
