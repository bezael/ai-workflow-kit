import { describe, it, expect } from 'vitest'
import { runHook } from '../utils/run-hook.js'

const hook = (command) => runHook('pre-bash-safety.sh', { command })

describe('pre-bash-safety: BLOCKED commands (exit 1)', () => {
  it('blocks rm -rf /', () => {
    const r = hook('rm -rf /')
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toMatch(/BLOCKED/)
  })

  it('blocks rm -rf ~', () => {
    const r = hook('rm -rf ~')
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toMatch(/BLOCKED/)
  })

  it('blocks dd if= (disk wipe)', () => {
    const r = hook('dd if=/dev/zero of=/dev/sda')
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toMatch(/BLOCKED/)
  })

  it('blocks mkfs (format disk)', () => {
    const r = hook('mkfs.ext4 /dev/sdb')
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toMatch(/BLOCKED/)
  })

  it('blocks > /dev/sda (write to disk)', () => {
    const r = hook('cat file > /dev/sda')
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toMatch(/BLOCKED/)
  })

  it('blocks chmod -R 777 / (world-writable root)', () => {
    const r = hook('chmod -R 777 /')
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toMatch(/BLOCKED/)
  })

  it('blocks fork bomb', () => {
    const r = hook(':(){ :|:& };:')
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toMatch(/BLOCKED/)
  })
})

describe('pre-bash-safety: WARNING commands (exit 0 + warning in stderr)', () => {
  it('warns on git push --force', () => {
    const r = hook('git push --force origin main')
    expect(r.exitCode).toBe(0)
    expect(r.stderr).toMatch(/WARNING/)
  })

  it('warns on git push -f', () => {
    const r = hook('git push -f origin main')
    expect(r.exitCode).toBe(0)
    expect(r.stderr).toMatch(/WARNING/)
  })

  it('warns on git reset --hard', () => {
    const r = hook('git reset --hard HEAD~1')
    expect(r.exitCode).toBe(0)
    expect(r.stderr).toMatch(/WARNING/)
  })

  it('warns on git clean -f', () => {
    const r = hook('git clean -f')
    expect(r.exitCode).toBe(0)
    expect(r.stderr).toMatch(/WARNING/)
  })

  it('warns on DROP TABLE', () => {
    const r = hook('psql -c "DROP TABLE users"')
    expect(r.exitCode).toBe(0)
    expect(r.stderr).toMatch(/WARNING/)
  })

  it('warns on DROP DATABASE', () => {
    const r = hook('mysql -e "DROP DATABASE myapp"')
    expect(r.exitCode).toBe(0)
    expect(r.stderr).toMatch(/WARNING/)
  })

  it('warns on DELETE FROM', () => {
    const r = hook('psql -c "DELETE FROM orders"')
    expect(r.exitCode).toBe(0)
    expect(r.stderr).toMatch(/WARNING/)
  })
})

describe('pre-bash-safety: secret detection (exit 0 + warning in stderr)', () => {
  it('warns when OPENAI_API_KEY is in the command', () => {
    const r = hook('export OPENAI_API_KEY=sk-projabcdef1234567890abcdef')
    expect(r.exitCode).toBe(0)
    expect(r.stderr).toMatch(/WARNING/)
  })

  it('warns when ANTHROPIC_API_KEY is in the command', () => {
    const r = hook('echo ANTHROPIC_API_KEY=sk-ant-api03-abc123')
    expect(r.exitCode).toBe(0)
    expect(r.stderr).toMatch(/WARNING/)
  })
})

describe('pre-bash-safety: SAFE commands (exit 0, no warnings)', () => {
  const safeCmds = [
    'npm install',
    'git status',
    'git diff',
    'node app.js',
    'ls -la',
    'cat package.json',
    'npx vitest run',
    'git add .',
    'git log --oneline',
  ]

  for (const cmd of safeCmds) {
    it(`allows: ${cmd}`, () => {
      const r = hook(cmd)
      expect(r.exitCode).toBe(0)
      expect(r.stderr).toBe('')
    })
  }
})
