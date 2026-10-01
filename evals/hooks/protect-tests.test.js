import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { runHook } from '../utils/run-hook.js'

let project

const edit = (file_path, tool_name = 'Edit') =>
  runHook('protect-tests.sh', { tool_name, tool_input: { file_path } }, { cwd: project, env: { CLAUDE_PROJECT_DIR: project } })
const bash = (command) =>
  runHook('protect-tests.sh', { tool_name: 'Bash', tool_input: { command } }, { cwd: project, env: { CLAUDE_PROJECT_DIR: project } })

function touch(rel) {
  const file = path.join(project, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, '// existing\n')
  return file
}

function protect() {
  fs.mkdirSync(path.join(project, '.ak'), { recursive: true })
  fs.writeFileSync(path.join(project, '.ak', 'protect-tests'), '')
}

beforeEach(() => { project = fs.mkdtempSync(path.join(os.tmpdir(), 'ak-protect-')) })
afterEach(() => { fs.rmSync(project, { recursive: true, force: true }) })

describe('protect-tests: inactive without the marker', () => {
  it('allows editing an existing test file', () => {
    const r = edit(touch('src/cart.test.ts'))
    expect(r.exitCode).toBe(0)
  })
})

describe('protect-tests: active with .ak/protect-tests', () => {
  beforeEach(protect)

  const testFiles = [
    'src/cart.test.ts',
    'src/cart.spec.js',
    'pkg/cart_test.go',
    'tests/test_cart.py',
    'src/__tests__/cart.tsx',
    'spec/cart_spec.rb',
  ]

  for (const rel of testFiles) {
    it(`blocks editing existing ${rel}`, () => {
      const r = edit(touch(rel))
      expect(r.exitCode).toBe(2)
      expect(r.stderr).toMatch(/fix the code, not the test/i)
    })
  }

  it('blocks Write over an existing test file', () => {
    const r = edit(touch('src/cart.test.ts'), 'Write')
    expect(r.exitCode).toBe(2)
  })

  it('allows creating a new test file (the red step)', () => {
    const r = edit(path.join(project, 'src/new.test.ts'), 'Write')
    expect(r.exitCode).toBe(0)
  })

  it('allows editing production code', () => {
    const r = edit(touch('src/cart.ts'))
    expect(r.exitCode).toBe(0)
  })

  it('does not treat a file named "contest.ts" as a test', () => {
    const r = edit(touch('src/contest.ts'))
    expect(r.exitCode).toBe(0)
  })

  it('blocks Bash commands that touch the marker', () => {
    const r = bash('rm .ak/protect-tests')
    expect(r.exitCode).toBe(2)
  })

  it('allows unrelated Bash commands', () => {
    const r = bash('npm test')
    expect(r.exitCode).toBe(0)
  })
})
