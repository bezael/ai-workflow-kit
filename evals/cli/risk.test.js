/**
 * Tests for the risk signal — the churn / fix-history hotspot ranking that
 * tells /ak-review where to spend its depth.
 *
 * The integration cases run real git against a real temp repository: history
 * is created commit by commit, so what the signal reads is what git actually
 * recorded, not a mocked transcript.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'
import {
  isFixSubject, parseWindow, readDefaultBranch, readSensitivePaths, parseHistory,
  scoreFile, classify, aggregate, changedFiles, computeRisk,
  globToRegExp, fileKind, reviewNeed, runRisk,
} from '../../bin/risk.js'

let root

function sh(args) {
  const res = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  if (res.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${res.stderr}`)
  return res.stdout
}

function write(file, content) {
  const full = path.join(root, file)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
}

function commit(message, files) {
  for (const [file, content] of Object.entries(files)) write(file, content)
  sh(['add', '-A'])
  sh(['commit', '-m', message])
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'akrisk-'))
  sh(['init', '-b', 'main'])
  sh(['config', 'user.email', 'test@example.com'])
  sh(['config', 'user.name', 'Test'])
  sh(['config', 'commit.gpgsign', 'false'])
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

describe('isFixSubject', () => {
  it('matches fix, bugfix, hotfix, bug, regression and revert', () => {
    for (const s of [
      'fix: null crash', 'Fixed the flaky logout', 'bugfix in parser',
      'hotfix for prod', 'closes a bug in totals', 'regression in sorting',
      'Revert "feat: new cache"',
    ]) expect(isFixSubject(s), s).toBe(true)
  })

  it('does not match prefix, suffix, fixture or plain features', () => {
    for (const s of [
      'add url prefix support', 'rename the suffix helper',
      'add login fixture', 'feat: add votes', 'docs: readme',
    ]) expect(isFixSubject(s), s).toBe(false)
  })
})

describe('parseWindow', () => {
  it('converts Nd / Nw / Nm / Ny into a git --since value', () => {
    expect(parseWindow('90d')).toBe('90 days ago')
    expect(parseWindow('2w')).toBe('14 days ago')
    expect(parseWindow('6m')).toBe('182 days ago')
    expect(parseWindow('1y')).toBe('365 days ago')
  })

  it('rejects garbage and non-positive spans', () => {
    for (const bad of ['', 'six months', '0d', '-3m', '6']) {
      expect(parseWindow(bad), bad).toBeNull()
    }
  })
})

describe('readDefaultBranch', () => {
  it('reads the Repo section of .ak/config.md', () => {
    write('.ak/config.md', '# Config\n\n## Repo\n- Default branch: trunk\n\n## Commands\n- Test: npm test\n')
    expect(readDefaultBranch(root)).toBe('trunk')
  })

  it('ignores unknown values and missing files', () => {
    expect(readDefaultBranch(root)).toBeNull()
    write('.ak/config.md', '## Repo\n- Default branch: unknown — no remote\n')
    expect(readDefaultBranch(root)).toBeNull()
  })
})

describe('readSensitivePaths', () => {
  it('reads the comma-separated globs of the Review section', () => {
    write('.ak/config.md', [
      '## Repo', '- Default branch: main', '',
      '## Review', '- Sensitive paths: src/auth/**, `db/migrations/**`,src/billing/**', '',
      '## Commands', '- Test: npm test',
    ].join('\n'))
    expect(readSensitivePaths(root)).toEqual(['src/auth/**', 'db/migrations/**', 'src/billing/**'])
  })

  it('is empty without a file, a section, or with a none / unknown value', () => {
    expect(readSensitivePaths(root)).toEqual([])
    write('.ak/config.md', '## Repo\n- Default branch: main\n')
    expect(readSensitivePaths(root)).toEqual([])
    write('.ak/config.md', '## Review\n- Sensitive paths: none — flat repo\n')
    expect(readSensitivePaths(root)).toEqual([])
  })
})

describe('globToRegExp', () => {
  const matches = (pattern, file) => globToRegExp(pattern).test(file)

  it('** spans directories, * and ? stay inside one segment', () => {
    expect(matches('src/auth/**', 'src/auth/session.ts')).toBe(true)
    expect(matches('src/auth/**', 'src/auth/oauth/google.ts')).toBe(true)
    expect(matches('src/auth/**', 'src/authors.ts')).toBe(false)
    expect(matches('**/migrations/**', 'migrations/001.sql')).toBe(true)
    expect(matches('**/migrations/**', 'db/migrations/001.sql')).toBe(true)
    expect(matches('*.md', 'README.md')).toBe(true)
    expect(matches('*.md', 'docs/README.md')).toBe(false)
    expect(matches('src/*/index.ts', 'src/auth/index.ts')).toBe(true)
    expect(matches('src/*/index.ts', 'src/auth/v2/index.ts')).toBe(false)
    expect(matches('config.??', 'config.js')).toBe(true)
    expect(matches('config.??', 'config.json')).toBe(false)
  })

  it('a bare path names a file or a directory subtree, and dots are literal', () => {
    expect(matches('src/auth', 'src/auth/session.ts')).toBe(true)
    expect(matches('src/auth/', 'src/auth/session.ts')).toBe(true)
    expect(matches('src/auth', 'src/auth')).toBe(true)
    expect(matches('src/auth', 'src/authors.ts')).toBe(false)
    expect(matches('.env.example', '.env.example')).toBe(true)
    expect(matches('.env.example', 'xenvxexample')).toBe(false)
  })
})

describe('fileKind', () => {
  it('tells docs, lockfiles, fixtures and tests from code by path alone', () => {
    for (const f of ['README.md', 'docs/skills/pr.md', 'LICENSE', 'CHANGELOG', 'guide.mdx']) {
      expect(fileKind(f), f).toBe('docs')
    }
    for (const f of ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'Cargo.lock', 'go.sum']) {
      expect(fileKind(f), f).toBe('lockfile')
    }
    for (const f of ['evals/fixtures/buggy-code/user.ts', 'src/__snapshots__/a.snap', 'test/fixture/data.json']) {
      expect(fileKind(f), f).toBe('fixture')
    }
    for (const f of ['evals/cli/risk.test.js', 'src/__tests__/a.js', 'pkg/x_test.go', 'tests/test_api.py', 'spec/user.spec.ts']) {
      expect(fileKind(f), f).toBe('test')
    }
    for (const f of ['bin/risk.js', 'src/auth/session.ts', 'Makefile', 'scripts/build.sh', 'requirements.txt', 'CMakeLists.txt']) {
      expect(fileKind(f), f).toBe('code')
    }
  })
})

describe('reviewNeed', () => {
  const row = (file, risk, extra = {}) => ({ file, risk, commits: 0, fixes: 0, churn: 0, ...extra })

  it('a sensitive path is HIGH regardless of history or kind, naming the pattern', () => {
    const r = reviewNeed(row('src/auth/session.ts', 'low', { commits: 1 }), { sensitive: ['src/auth/**'] })
    expect(r.need).toBe('high')
    expect(r.reasons).toEqual(['sensitive path: src/auth/**'])
    // sensitive wins over docs-only
    const d = reviewNeed(row('docs/auth/threat-model.md', 'low'), { sensitive: ['docs/auth/**'] })
    expect(d).toMatchObject({ need: 'high', kind: 'docs' })
    // a hot sensitive file carries both reasons
    const h = reviewNeed(row('src/auth/session.ts', 'high', { commits: 6, fixes: 4 }), { sensitive: ['src/auth/**'], window: '6m' })
    expect(h.reasons).toEqual(['sensitive path: src/auth/**', '4 fix commits in 6m'])
  })

  it('docs, lockfiles and fixtures are LOW whatever their history', () => {
    expect(reviewNeed(row('README.md', 'high', { commits: 20, fixes: 5 }))).toMatchObject({ need: 'low', reasons: ['docs only'] })
    expect(reviewNeed(row('package-lock.json', 'high', { commits: 20 }))).toMatchObject({ need: 'low', reasons: ['generated lockfile'] })
    expect(reviewNeed(row('evals/fixtures/a.json', 'medium', { commits: 3, fixes: 1 }))).toMatchObject({ need: 'low', reasons: ['test fixture data'] })
  })

  it('code and tests take their history level; new maps to MEDIUM', () => {
    expect(reviewNeed(row('a.js', 'high', { commits: 5, fixes: 3 }), { window: '6m' }))
      .toMatchObject({ need: 'high', kind: 'code', reasons: ['3 fix commits in 6m'] })
    expect(reviewNeed(row('a.js', 'high', { commits: 16, fixes: 0 }), { window: '6m' }).reasons)
      .toEqual(['hot file: 16 commits in 6m'])
    expect(reviewNeed(row('a.js', 'medium', { commits: 2, fixes: 1 })).reasons).toEqual(['1 fix commit in the window'])
    expect(reviewNeed(row('a.js', 'low', { commits: 2 }))).toMatchObject({ need: 'low' })
    expect(reviewNeed(row('a.js', 'new'))).toMatchObject({ need: 'medium', reasons: ['new code, unknown risk'] })
    expect(reviewNeed(row('a.test.js', 'high', { commits: 5, fixes: 3 }))).toMatchObject({ need: 'high', kind: 'test' })
  })
})

describe('parseHistory / aggregate / classify', () => {
  const RAW = [
    '\x01aaa\tAlice\tfix: crash in a',
    '3\t1\ta.js',
    '',
    '\x01bbb\tBob\tfeat: add b',
    '10\t0\tb.js',
    '-\t-\tlogo.png',
    '',
    '\x01ccc\tAlice\tfix: edge case',
    '2\t2\ta.js',
    '1\t0\tb.js',
  ].join('\n')

  it('parses commits with their numstat lines, binaries as zero churn', () => {
    const commits = parseHistory(RAW)
    expect(commits).toHaveLength(3)
    expect(commits[0]).toMatchObject({ author: 'Alice', subject: 'fix: crash in a' })
    expect(commits[1].files).toContainEqual({ path: 'logo.png', added: 0, deleted: 0 })
  })

  it('aggregates per file and sorts by score', () => {
    const rows = aggregate(parseHistory(RAW), ['a.js', 'b.js', 'new.js'])
    const a = rows.find(r => r.file === 'a.js')
    expect(a).toMatchObject({ commits: 2, fixes: 2, churn: 8, authors: 1 })
    expect(rows.find(r => r.file === 'b.js')).toMatchObject({ commits: 2, fixes: 1, authors: 2 })
    expect(rows.find(r => r.file === 'new.js').risk).toBe('new')
    expect(rows[0].file).toBe('a.js')
  })

  it('classifies by fix count first, then score', () => {
    expect(classify({ commits: 0, fixes: 0, churn: 0 })).toBe('new')
    expect(classify({ commits: 2, fixes: 0, churn: 40 })).toBe('low')
    expect(classify({ commits: 2, fixes: 1, churn: 40 })).toBe('medium')
    expect(classify({ commits: 4, fixes: 3, churn: 40 })).toBe('high')
    // no fixes, but hot enough on volume alone
    expect(classify({ commits: 16, fixes: 0, churn: 0 })).toBe('high')
    expect(scoreFile({ commits: 1, fixes: 1, churn: 200 })).toBe(5)
  })
})

describe('computeRisk (integration)', () => {
  function seedHistory() {
    commit('feat: add a', { 'a.js': 'let a = 1\n' })
    commit('fix: crash in a', { 'a.js': 'let a = 2\n' })
    commit('fix: edge case in a', { 'a.js': 'let a = 3\n' })
    commit('fix: regression in a', { 'a.js': 'let a = 4\n' })
    commit('feat: add b', { 'b.js': 'let b = 1\n' })
    commit('fix: b off-by-one', { 'b.js': 'let b = 2\n' })
    commit('docs: add c', { 'c.md': '# c\n' })
  }

  it('scores the branch diff against the base', () => {
    seedHistory()
    sh(['checkout', '-b', 'feature'])
    commit('feat: work on the branch', {
      'a.js': 'let a = 5\n', 'b.js': 'let b = 3\n', 'c.md': '# c!\n',
    })

    const result = computeRisk({ root, base: 'main' })
    expect(result.error).toBeUndefined()
    expect(result.source).toBe('diff')
    expect(result.sparse).toBe(true)

    const byFile = Object.fromEntries(result.files.map(f => [f.file, f]))
    expect(Object.keys(byFile).sort()).toEqual(['a.js', 'b.js', 'c.md'])
    expect(byFile['a.js'].risk).toBe('high')      // 3 fixes on main + branch touch
    expect(byFile['a.js'].fixes).toBe(3)
    expect(byFile['b.js'].risk).toBe('medium')    // 1 fix
    expect(byFile['c.md'].risk).toBe('low')       // docs only
    expect(result.files[0].file).toBe('a.js')     // sorted hottest first
  })

  it('scores named files instead of the diff, marking history-less ones as new', () => {
    seedHistory()
    write('d.js', 'let d = 1\n') // on disk, never committed

    const result = computeRisk({ root, base: 'main', files: ['a.js', 'd.js'] })
    expect(result.source).toBe('args')
    const byFile = Object.fromEntries(result.files.map(f => [f.file, f]))
    expect(byFile['a.js'].risk).toBe('high')
    expect(byFile['d.js'].risk).toBe('new')
  })

  it('falls back to the working tree when the branch has no commits of its own', () => {
    seedHistory()
    write('a.js', 'let a = 99\n') // uncommitted change on main
    const result = computeRisk({ root, base: 'main' })
    expect(result.files.map(f => f.file)).toEqual(['a.js'])
  })

  it('attaches need + reasons per file and a focus summary (--focus --json)', () => {
    seedHistory()
    write('.ak/config.md', '## Repo\n- Default branch: main\n\n## Review\n- Sensitive paths: src/auth/**\n')
    write('src/auth/login.js', 'export const login = () => {}\n') // brand new, no history

    const lines = []
    const spy = vi.spyOn(console, 'log').mockImplementation((...a) => lines.push(a.join(' ')))
    let code
    try {
      code = runRisk(['--focus', '--json', 'a.js', 'c.md', 'src/auth/login.js'], { root })
    } finally {
      spy.mockRestore()
    }
    expect(code).toBe(0)
    const result = JSON.parse(lines.join('\n'))

    expect(result.sensitive).toEqual(['src/auth/**'])
    const byFile = Object.fromEntries(result.files.map(f => [f.file, f]))
    expect(byFile['c.md']).toMatchObject({ need: 'low', kind: 'docs', reasons: ['docs only'] })
    expect(byFile['src/auth/login.js']).toMatchObject({ risk: 'new', need: 'high', reasons: ['sensitive path: src/auth/**'] })
    expect(byFile['a.js']).toMatchObject({ risk: 'high', need: 'high' })
    expect(byFile['a.js'].reasons[0]).toMatch(/3 fix commits/)
    expect(result.focus).toEqual({ high: 2, medium: 0, low: 1, humanReviewRequired: true })
  })

  it('needs no human when nothing is HIGH, and the plain table is unchanged', () => {
    seedHistory()
    const result = computeRisk({ root, base: 'main', files: ['b.js', 'c.md'] })
    expect(result.sensitive).toEqual([])
    expect(result.focus).toEqual({ high: 0, medium: 1, low: 1, humanReviewRequired: false })
    expect(result.files.map(f => f.file)).toEqual(['b.js', 'c.md']) // still sorted by score

    const lines = []
    const spy = vi.spyOn(console, 'log').mockImplementation((...a) => lines.push(a.join(' ')))
    try {
      runRisk(['b.js', 'c.md'], { root })
      const plain = lines.join('\n')
      expect(plain).toMatch(/RISK\s+COMMITS\s+FIXES\s+CHURN\s+AUTHORS\s+FILE/)
      expect(plain).not.toMatch(/Human review required/)
      lines.length = 0
      runRisk(['--focus', 'b.js', 'c.md'], { root })
      const focus = lines.join('\n')
      expect(focus).toMatch(/NEED\s+FILE\s+WHY/)
      expect(focus).toMatch(/Human review required: no/)
      expect(focus).toMatch(/docs only/)
    } finally {
      spy.mockRestore()
    }
  })

  it('reports errors instead of guessing', () => {
    expect(computeRisk({ root, window: 'six months' }).error).toMatch(/--window/)
    commit('feat: a', { 'a.js': 'let a = 1\n' })
    expect(computeRisk({ root, base: 'main' }).error).toMatch(/No files to score/)
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'akrisk-nogit-'))
    try {
      expect(computeRisk({ root: outside }).error).toMatch(/Not a git repository/)
    } finally {
      fs.rmSync(outside, { recursive: true, force: true })
    }
  })
})
