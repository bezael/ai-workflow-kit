import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import extension from '../../pi/extensions/ak-hooks.ts'

// A stand-in for Pi's ExtensionAPI: it records the handlers the extension
// registers so each test can fire one event and read back the answer.
function loadExtension() {
  const handlers = {}
  extension({ on: (event, handler) => { handlers[event] = handler } })
  return handlers
}

function makeCtx({ cwd, hasUI = false, confirm = async () => true } = {}) {
  const notices = []
  return {
    cwd,
    hasUI,
    mode: hasUI ? 'tui' : 'print',
    signal: undefined,
    ui: { confirm, notify: (msg) => notices.push(msg) },
    notices,
  }
}

const bash = (command) => ({ type: 'tool_call', toolName: 'bash', toolCallId: 't1', input: { command } })

let cwd
beforeEach(() => { cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ak-pi-')) })
afterEach(() => { fs.rmSync(cwd, { recursive: true, force: true }) })

describe('pi extension: registration', () => {
  it('listens to tool_call, tool_result and agent_settled', () => {
    expect(Object.keys(loadExtension()).sort()).toEqual(['agent_settled', 'tool_call', 'tool_result'])
  })
})

describe('pi extension: pre-bash-safety on tool_call', () => {
  it('blocks a destructive command with the script\'s message as the reason', async () => {
    const r = await loadExtension().tool_call(bash('rm -rf /'), makeCtx({ cwd }))
    expect(r?.block).toBe(true)
    expect(r.reason).toMatch(/BLOCKED/)
  })

  it('lets a safe command through', async () => {
    expect(await loadExtension().tool_call(bash('git status'), makeCtx({ cwd }))).toBeUndefined()
  })

  it('blocks a risky command when there is no UI to confirm it', async () => {
    const r = await loadExtension().tool_call(bash('git reset --hard'), makeCtx({ cwd }))
    expect(r?.block).toBe(true)
    expect(r.reason).toMatch(/no UI to confirm/)
  })

  it('asks the user about a risky command and runs it when they accept', async () => {
    const asked = []
    const ctx = makeCtx({ cwd, hasUI: true, confirm: async (title, msg) => { asked.push(msg); return true } })
    expect(await loadExtension().tool_call(bash('git reset --hard'), ctx)).toBeUndefined()
    expect(asked[0]).toMatch(/git reset --hard/)
  })

  it('blocks a risky command the user declines', async () => {
    const ctx = makeCtx({ cwd, hasUI: true, confirm: async () => false })
    const r = await loadExtension().tool_call(bash('git reset --hard'), ctx)
    expect(r?.block).toBe(true)
    expect(r.reason).toMatch(/Declined by the user/)
  })
})

describe('pi extension: protect-tests on tool_call', () => {
  beforeEach(() => {
    fs.mkdirSync(path.join(cwd, '.ak'))
    fs.writeFileSync(path.join(cwd, '.ak', 'protect-tests'), '')
    fs.writeFileSync(path.join(cwd, 'sum.test.js'), 'test("sum", () => {})\n')
  })

  it('blocks editing an existing test file, given a path relative to the session cwd', async () => {
    const event = { type: 'tool_call', toolName: 'edit', toolCallId: 't2', input: { path: 'sum.test.js', edits: [] } }
    const r = await loadExtension().tool_call(event, makeCtx({ cwd }))
    expect(r?.block).toBe(true)
    expect(r.reason).toMatch(/test files are protected/)
  })

  it('allows writing a new test file (the red step)', async () => {
    const event = { type: 'tool_call', toolName: 'write', toolCallId: 't3', input: { path: 'new.test.js', content: '' } }
    expect(await loadExtension().tool_call(event, makeCtx({ cwd }))).toBeUndefined()
  })

  it('blocks removing the marker from bash', async () => {
    const r = await loadExtension().tool_call(bash('rm .ak/protect-tests'), makeCtx({ cwd }))
    expect(r?.block).toBe(true)
  })
})

describe('pi extension: other tools and results', () => {
  it('ignores tools the hooks do not cover', async () => {
    const event = { type: 'tool_call', toolName: 'read', toolCallId: 't4', input: { path: 'x' } }
    expect(await loadExtension().tool_call(event, makeCtx({ cwd }))).toBeUndefined()
  })

  it('leaves a result alone when the post hooks have nothing to report', async () => {
    const event = {
      type: 'tool_result', toolName: 'edit', toolCallId: 't5', isError: false,
      input: { path: 'notes.md' }, content: [{ type: 'text', text: 'ok' }],
    }
    expect(await loadExtension().tool_result(event, makeCtx({ cwd }))).toBeUndefined()
  })

  it('appends lint errors from post-edit-lint to the edit result, so the model can fix them', async () => {
    // A fake local ESLint that always reports one problem.
    const bin = path.join(cwd, 'node_modules', '.bin')
    fs.mkdirSync(bin, { recursive: true })
    fs.writeFileSync(path.join(bin, 'eslint'), '#!/bin/bash\necho "app.ts: line 1, Error - no-unused-vars"\nexit 1\n', { mode: 0o755 })
    fs.writeFileSync(path.join(cwd, 'app.ts'), 'const x = 1\n')

    const event = {
      type: 'tool_result', toolName: 'edit', toolCallId: 't6', isError: false,
      input: { path: 'app.ts' }, content: [{ type: 'text', text: 'Edited app.ts' }],
    }
    const r = await loadExtension().tool_result(event, makeCtx({ cwd }))
    expect(r.content[0]).toEqual({ type: 'text', text: 'Edited app.ts' })
    expect(r.content[1].text).toMatch(/ESLint found issues[\s\S]*no-unused-vars/)
  })

  it('does not notify outside the terminal UI', async () => {
    const ctx = makeCtx({ cwd })
    await loadExtension().agent_settled({ type: 'agent_settled' }, ctx)
    expect(ctx.notices).toEqual([])
  })
})
