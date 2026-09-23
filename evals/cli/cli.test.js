import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const CLI_PATH = path.resolve(__dir, '../../bin/cli.js')
const REPO_ROOT = path.resolve(__dir, '../..')

function runCLI(args, home) {
  const result = spawnSync('node', [CLI_PATH, ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
    cwd: REPO_ROOT,
  })
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

let tmpHome

beforeAll(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'awk-cli-test-'))
})

afterAll(() => {
  fs.rmSync(tmpHome, { recursive: true, force: true })
})

describe('CLI --list', () => {
  it('lists 7 skills', () => {
    const r = runCLI(['--list'], tmpHome)
    expect(r.exitCode).toBe(0)
    // 7 skills: commit, pr, review, plan, debug, vibe-audit, memory
    const skillMatches = r.stdout.match(/\/[a-z-]+/g) ?? []
    expect(skillMatches.length).toBeGreaterThanOrEqual(7)
  })

  it('lists agents section', () => {
    const r = runCLI(['--list'], tmpHome)
    expect(r.stdout).toMatch(/Agent/i)
  })

  it('lists hooks section', () => {
    const r = runCLI(['--list'], tmpHome)
    expect(r.stdout).toMatch(/Hook/i)
  })
})

describe('CLI --skills --yes', () => {
  let skillsHome

  beforeAll(() => {
    skillsHome = fs.mkdtempSync(path.join(os.tmpdir(), 'awk-skills-test-'))
    runCLI(['--skills', '--yes'], skillsHome)
  })

  afterAll(() => {
    fs.rmSync(skillsHome, { recursive: true, force: true })
  })

  it('creates ~/.claude/skills/ directory', () => {
    const dir = path.join(skillsHome, '.claude', 'skills')
    expect(fs.existsSync(dir)).toBe(true)
  })

  it('copies skill directories to ~/.claude/skills/', () => {
    const dir = path.join(skillsHome, '.claude', 'skills')
    const entries = fs.readdirSync(dir)
    expect(entries).toContain('ak-commit')
    expect(entries).toContain('ak-pr')
    expect(entries).toContain('ak-review')
    expect(entries).toContain('ak-plan')
    expect(entries).toContain('ak-debug')
    expect(entries).toContain('ak-vibe-audit')
    expect(entries).toContain('ak-memory')
  })

  it('names every skill with the ak- prefix, matching its directory', () => {
    const skillsDir = path.join(skillsHome, '.claude', 'skills')
    for (const dir of fs.readdirSync(skillsDir)) {
      const md = fs.readFileSync(path.join(skillsDir, dir, 'SKILL.md'), 'utf8')
      expect(md).toMatch(new RegExp(`^name: ${dir}$`, 'm'))
      expect(dir).toMatch(/^ak-[a-z0-9-]+$/)
    }
  })

  it('each skill directory contains SKILL.md', () => {
    const skillsDir = path.join(skillsHome, '.claude', 'skills')
    for (const name of ['ak-commit', 'ak-pr', 'ak-review', 'ak-plan', 'ak-debug', 'ak-vibe-audit', 'ak-memory']) {
      const skillMd = path.join(skillsDir, name, 'SKILL.md')
      expect(fs.existsSync(skillMd), `${name}/SKILL.md should exist`).toBe(true)
    }
  })

  it('copies agent files to ~/.claude/agents/', () => {
    const dir = path.join(skillsHome, '.claude', 'agents')
    expect(fs.existsSync(dir)).toBe(true)
    const files = fs.readdirSync(dir)
    expect(files).toContain('ak-frontend.md')
    expect(files).toContain('ak-api.md')
    expect(files).toContain('ak-test.md')
    expect(files).toContain('ak-refactor.md')
    expect(files).toContain('ak-docs.md')
  })

  it('names every agent with the ak- prefix, matching its file', () => {
    const dir = path.join(skillsHome, '.claude', 'agents')
    for (const file of fs.readdirSync(dir)) {
      const md = fs.readFileSync(path.join(dir, file), 'utf8')
      expect(md).toMatch(new RegExp(`^name: ${path.basename(file, '.md')}$`, 'm'))
    }
  })

  it('does NOT create hooks directory', () => {
    const dir = path.join(skillsHome, '.claude', 'hooks')
    expect(fs.existsSync(dir)).toBe(false)
  })

  it('does NOT create settings.json', () => {
    const settings = path.join(skillsHome, '.claude', 'settings.json')
    expect(fs.existsSync(settings)).toBe(false)
  })
})

describe('CLI --hooks --yes', () => {
  let hooksHome

  beforeAll(() => {
    hooksHome = fs.mkdtempSync(path.join(os.tmpdir(), 'awk-hooks-test-'))
    runCLI(['--hooks', '--yes'], hooksHome)
  })

  afterAll(() => {
    fs.rmSync(hooksHome, { recursive: true, force: true })
  })

  it('creates ~/.claude/hooks/ directory', () => {
    const dir = path.join(hooksHome, '.claude', 'hooks')
    expect(fs.existsSync(dir)).toBe(true)
  })

  it('copies all hook .sh files', () => {
    const dir = path.join(hooksHome, '.claude', 'hooks')
    const files = fs.readdirSync(dir)
    expect(files).toContain('pre-bash-safety.sh')
    expect(files).toContain('pre-commit-secrets.sh')
    expect(files).toContain('post-write-format.sh')
    expect(files).toContain('post-edit-lint.sh')
    expect(files).toContain('notify-done.sh')
  })

  it('creates settings.json', () => {
    const settings = path.join(hooksHome, '.claude', 'settings.json')
    expect(fs.existsSync(settings)).toBe(true)
  })

  it('settings.json has PreToolUse hook for Bash', () => {
    const settings = JSON.parse(
      fs.readFileSync(path.join(hooksHome, '.claude', 'settings.json'), 'utf8')
    )
    expect(settings.hooks?.PreToolUse).toBeDefined()
    const bashHook = settings.hooks.PreToolUse.find(h => h.matcher === 'Bash')
    expect(bashHook).toBeDefined()
  })

  it('settings.json has PostToolUse hooks for Write and Edit', () => {
    const settings = JSON.parse(
      fs.readFileSync(path.join(hooksHome, '.claude', 'settings.json'), 'utf8')
    )
    const post = settings.hooks?.PostToolUse ?? []
    const matchers = post.map(h => h.matcher)
    expect(matchers).toContain('Write')
    expect(matchers).toContain('Edit')
  })

  it('settings.json has Stop hook', () => {
    const settings = JSON.parse(
      fs.readFileSync(path.join(hooksHome, '.claude', 'settings.json'), 'utf8')
    )
    expect(settings.hooks?.Stop).toBeDefined()
  })

  it('does NOT create skills directory', () => {
    const dir = path.join(hooksHome, '.claude', 'skills')
    expect(fs.existsSync(dir)).toBe(false)
  })
})

describe('CLI --yes (full install)', () => {
  let fullHome

  beforeAll(() => {
    fullHome = fs.mkdtempSync(path.join(os.tmpdir(), 'awk-full-test-'))
    runCLI(['--yes'], fullHome)
  })

  afterAll(() => {
    fs.rmSync(fullHome, { recursive: true, force: true })
  })

  it('installs both skills and hooks', () => {
    expect(fs.existsSync(path.join(fullHome, '.claude', 'skills'))).toBe(true)
    expect(fs.existsSync(path.join(fullHome, '.claude', 'hooks'))).toBe(true)
    expect(fs.existsSync(path.join(fullHome, '.claude', 'settings.json'))).toBe(true)
  })
})

describe('CLI --uninstall', () => {
  let uninstallHome

  beforeAll(() => {
    uninstallHome = fs.mkdtempSync(path.join(os.tmpdir(), 'awk-uninstall-test-'))
    runCLI(['--yes'], uninstallHome)
    runCLI(['--uninstall'], uninstallHome)
  })

  afterAll(() => {
    fs.rmSync(uninstallHome, { recursive: true, force: true })
  })

  it('removes skill directories', () => {
    const skillsDir = path.join(uninstallHome, '.claude', 'skills')
    if (fs.existsSync(skillsDir)) {
      const entries = fs.readdirSync(skillsDir)
      expect(entries).not.toContain('ak-commit')
      expect(entries).not.toContain('ak-pr')
    }
    // If dir doesn't exist, that's also acceptable (fully cleaned up)
  })

  it('removes hook files', () => {
    const hooksDir = path.join(uninstallHome, '.claude', 'hooks')
    if (fs.existsSync(hooksDir)) {
      const files = fs.readdirSync(hooksDir)
      expect(files).not.toContain('pre-bash-safety.sh')
    }
  })
})

describe('CLI upgrade from the ak: names', () => {
  let upgradeHome, skillsDir, agentsDir

  beforeAll(() => {
    upgradeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'awk-upgrade-test-'))
    skillsDir = path.join(upgradeHome, '.claude', 'skills')
    agentsDir = path.join(upgradeHome, '.claude', 'agents')

    // What a pre-3.0 install left behind
    fs.mkdirSync(path.join(skillsDir, 'commit'), { recursive: true })
    fs.writeFileSync(path.join(skillsDir, 'commit', 'SKILL.md'), '---\nname: ak:commit\n---\n')
    fs.mkdirSync(agentsDir, { recursive: true })
    fs.writeFileSync(path.join(agentsDir, 'api.md'), '---\nname: ak:api\n---\n')

    // The user's own skill that happens to share a directory name
    fs.mkdirSync(path.join(skillsDir, 'review'), { recursive: true })
    fs.writeFileSync(path.join(skillsDir, 'review', 'SKILL.md'), '---\nname: review\n---\n')

    runCLI(['--skills', '--yes'], upgradeHome)
  })

  afterAll(() => {
    fs.rmSync(upgradeHome, { recursive: true, force: true })
  })

  it('removes the kit skill installed under its old name', () => {
    expect(fs.existsSync(path.join(skillsDir, 'commit'))).toBe(false)
    expect(fs.existsSync(path.join(skillsDir, 'ak-commit', 'SKILL.md'))).toBe(true)
  })

  it('removes the kit agent installed under its old name', () => {
    expect(fs.existsSync(path.join(agentsDir, 'api.md'))).toBe(false)
    expect(fs.existsSync(path.join(agentsDir, 'ak-api.md'))).toBe(true)
  })

  it("leaves a user's own same-named skill alone", () => {
    expect(fs.existsSync(path.join(skillsDir, 'review', 'SKILL.md'))).toBe(true)
  })
})

describe('CLI settings.json merge (existing settings)', () => {
  let mergeHome

  beforeAll(() => {
    mergeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'awk-merge-test-'))
    const claudeDir = path.join(mergeHome, '.claude')
    fs.mkdirSync(claudeDir, { recursive: true })

    // Pre-existing settings with a custom hook
    const existing = {
      theme: 'dark',
      hooks: {
        PreToolUse: [
          { matcher: 'Read', hooks: [{ type: 'command', command: 'echo "custom hook"' }] }
        ]
      }
    }
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify(existing, null, 2))

    runCLI(['--hooks', '--yes'], mergeHome)
  })

  afterAll(() => {
    fs.rmSync(mergeHome, { recursive: true, force: true })
  })

  it('preserves existing settings (theme)', () => {
    const settings = JSON.parse(
      fs.readFileSync(path.join(mergeHome, '.claude', 'settings.json'), 'utf8')
    )
    expect(settings.theme).toBe('dark')
  })

  it('preserves existing hooks (Read hook)', () => {
    const settings = JSON.parse(
      fs.readFileSync(path.join(mergeHome, '.claude', 'settings.json'), 'utf8')
    )
    const readHook = settings.hooks?.PreToolUse?.find(h => h.matcher === 'Read')
    expect(readHook).toBeDefined()
  })

  it('adds Bash hook without duplicating Read hook', () => {
    const settings = JSON.parse(
      fs.readFileSync(path.join(mergeHome, '.claude', 'settings.json'), 'utf8')
    )
    const matchers = settings.hooks?.PreToolUse?.map(h => h.matcher) ?? []
    expect(matchers).toContain('Bash')
    expect(matchers).toContain('Read')
    // No duplicates
    expect(matchers.filter(m => m === 'Bash').length).toBe(1)
  })
})
