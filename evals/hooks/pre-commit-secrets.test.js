import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync, spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const HOOK_PATH = path.resolve(__dir, '../../hooks/pre-commit-secrets.sh')

let tmpRepo

/**
 * Run the hook against the current staged state of tmpRepo.
 * The hook only acts when the command contains "git commit".
 */
function runHookInRepo(payload = { command: 'git commit -m "test"' }) {
  const result = spawnSync('bash', [HOOK_PATH], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: tmpRepo,
    env: { ...process.env, GIT_DIR: path.join(tmpRepo, '.git') },
  })
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

/**
 * Stage a file with given content in the tmp repo.
 */
function stageFile(filename, content) {
  const filePath = path.join(tmpRepo, filename)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
  execSync(`git add "${filename}"`, { cwd: tmpRepo })
}

/**
 * Fully reset the repo to HEAD: removes all staged changes and untracked files.
 * git reset --hard HEAD is the most reliable cross-platform approach.
 */
function resetStaged() {
  try { execSync('git reset --hard HEAD -q', { cwd: tmpRepo, stdio: 'pipe' }) } catch {}
  try { execSync('git clean -fd -q', { cwd: tmpRepo, stdio: 'pipe' }) } catch {}
}

beforeAll(() => {
  tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'awk-secrets-test-'))
  execSync('git init -q', { cwd: tmpRepo })
  execSync('git config user.email "test@test.com"', { cwd: tmpRepo })
  execSync('git config user.name "Test"', { cwd: tmpRepo })
  // Initial empty commit so git diff --cached works
  execSync('git commit --allow-empty -m "init" -q', { cwd: tmpRepo })
})

afterAll(() => {
  fs.rmSync(tmpRepo, { recursive: true, force: true })
})

describe('pre-commit-secrets: BLOCKED — secrets detected', () => {
  it('blocks OpenAI API key (sk-...)', () => {
    resetStaged()
    stageFile('config.js', `const key = "sk-abcdefghijklmnopqrstuvwxyz123456789012345678"`)
    const r = runHookInRepo()
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toMatch(/BLOCKED/)
  })

  it('blocks Anthropic API key (sk-ant-...)', () => {
    resetStaged()
    stageFile('src/api.ts', `const key = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890abcdefgh"`)
    const r = runHookInRepo()
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toMatch(/BLOCKED/)
  })

  it('blocks AWS access key (AKIA...)', () => {
    resetStaged()
    stageFile('deploy.js', `const key = "AKIAIOSFODNN7EXAMPLE"`)
    const r = runHookInRepo()
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toMatch(/BLOCKED/)
  })

  it('blocks hardcoded password', () => {
    resetStaged()
    stageFile('db.js', `const password = "supersecretpassword123"`)
    const r = runHookInRepo()
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toMatch(/BLOCKED/)
  })

  it('blocks URL with embedded credentials', () => {
    resetStaged()
    stageFile('config.js', `const url = "https://admin:password123@mydb.example.com"`)
    const r = runHookInRepo()
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toMatch(/BLOCKED/)
  })

  it('blocks MongoDB URL with credentials', () => {
    resetStaged()
    stageFile('db.js', `const uri = "mongodb://root:secret@mongo.example.com:27017/mydb"`)
    const r = runHookInRepo()
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toMatch(/BLOCKED/)
  })

  it('blocks RSA private key', () => {
    resetStaged()
    stageFile('key.pem', '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----')
    const r = runHookInRepo()
    expect(r.exitCode).toBe(1)
    expect(r.stderr).toMatch(/BLOCKED/)
  })
})

describe('pre-commit-secrets: ALLOWED — clean or exempt files', () => {
  it('allows clean JS file', () => {
    resetStaged()
    stageFile('src/utils.js', `export function add(a, b) { return a + b }`)
    const r = runHookInRepo()
    expect(r.exitCode).toBe(0)
  })

  it('skips .env.example (intentional placeholders)', () => {
    resetStaged()
    stageFile('.env.example', `OPENAI_API_KEY=your_key_here\nDATABASE_URL=postgresql://user:pass@host/db`)
    const r = runHookInRepo()
    expect(r.exitCode).toBe(0)
  })

  it('skips binary files (.png)', () => {
    resetStaged()
    stageFile('logo.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString())
    const r = runHookInRepo()
    expect(r.exitCode).toBe(0)
  })

  it('skips lock files (.lock)', () => {
    resetStaged()
    stageFile('package-lock.json', `{ "lockfileVersion": 3 }`)
    // lock files are skipped by extension — rename to .lock
    resetStaged()
    stageFile('yarn.lock', `# yarn lockfile v1\n`)
    const r = runHookInRepo()
    expect(r.exitCode).toBe(0)
  })

  it('does not act on non-commit commands', () => {
    resetStaged()
    stageFile('src/index.js', `const key = "sk-abcdefghijklmnopqrstuvwxyz1234567890"`)
    // Pass a non-commit command — hook should exit 0 without scanning
    const r = runHookInRepo({ command: 'git status' })
    expect(r.exitCode).toBe(0)
  })
})
