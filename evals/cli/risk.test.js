/**
 * Tests for the risk signal — the churn / fix-history hotspot ranking that
 * tells /ak:review where to spend its depth.
 *
 * The integration cases run real git against a real temp repository: history
 * is created commit by commit, so what the signal reads is what git actually
 * recorded, not a mocked transcript.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'
import {
  isFixSubject, parseWindow, readDefaultBranch, parseHistory,
  scoreFile, classify, aggregate, changedFiles, computeRisk,
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
