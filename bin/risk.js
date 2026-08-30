/**
 * Risk signal — churn and fix-history hotspots for the files under review.
 *
 * The cheap, deterministic version of the "bug proneness" stage that agentic
 * code review research describes: relative code churn predicts defect density
 * (Nagappan & Ball, 2005) and past fixes mark future fault hotspots (Kim et
 * al., 2007). No LLM and no scoring service — one `git log`, aggregated per
 * file, so /ak:review can spend its depth where history says defects cluster.
 *
 *   npx ai-workflow-kit risk [files...]   score the changed files (or these)
 *     --base <branch>   diff base for the changed-files set
 *                       (default: .ak/config.md → Default branch, else main)
 *     --window <6m>     history window: Nd / Nw / Nm / Ny (default 6m)
 *     --json            machine-readable output
 *
 * The signal is evidence, not a verdict: a HIGH file is where the review
 * starts, never a finding by itself. A file with no history in the window is
 * new code — its risk is unknown, which is not the same as low.
 */

import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
}
const warn = (s) => console.log(`${c.yellow}⚠${c.reset}  ${s}`)
const fail = (s) => console.log(`${c.red}✗${c.reset}  ${s}`)
const info = (s) => console.log(`${c.cyan}ℹ${c.reset}  ${s}`)
const dim  = (s) => console.log(`${c.dim}  ${s}${c.reset}`)

// ─── Signals ─────────────────────────────────────────────────────────────────

/**
 * A commit "smells like a fix" from its subject alone. `fix(es|ed)?\b`
 * catches fix, fixed, bugfix and hotfix while the lookbehind keeps
 * prefix/suffix out; fixture fails the trailing boundary on its own.
 */
const FIX_RE = /(?<!pre|suf)fix(es|ed)?\b|\bbugs?\b|\bregression\b|\brevert\b/i

export function isFixSubject(subject) {
  return FIX_RE.test(subject || '')
}

/** "6m" → "182 days ago" for git --since. Nd / Nw / Nm / Ny; null if invalid. */
export function parseWindow(spec) {
  const m = /^(\d+)([dwmy])$/i.exec((spec || '').trim())
  if (!m) return null
  const n = parseInt(m[1], 10)
  if (n <= 0) return null
  const days = { d: 1, w: 7, m: 30.4, y: 365 }[m[2].toLowerCase()]
  return `${Math.round(n * days)} days ago`
}

/** `.ak/config.md` § Repo → `- Default branch: X`, or null. */
export function readDefaultBranch(root) {
  const file = path.join(root, '.ak', 'config.md')
  if (!fs.existsSync(file)) return null

  let inRepo = false
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/)
    if (heading) { inRepo = /^repo$/i.test(heading[1]); continue }
    if (!inRepo) continue
    const m = line.match(/^\s*-\s*Default branch:\s*(.+?)\s*$/i)
    if (m && !/^unknown\b/i.test(m[1])) return m[1].replace(/^`(.+)`$/, '$1')
  }
  return null
}

// ─── Git plumbing ────────────────────────────────────────────────────────────

function git(root, args) {
  const res = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  return { ok: res.status === 0, out: (res.stdout || '').trim() }
}

/**
 * Files the review will look at: the branch diff against the base
 * (merge-base, three-dot), falling back to the working tree when the branch
 * has no commits of its own yet. Deleted files carry no review depth and are
 * dropped.
 */
export function changedFiles(root, base) {
  let files = []
  const diff = git(root, ['diff', '--name-only', `${base}...HEAD`])
  if (diff.ok && diff.out) {
    files = diff.out.split('\n')
  } else {
    const tracked   = git(root, ['diff', '--name-only', 'HEAD'])
    const untracked = git(root, ['ls-files', '--others', '--exclude-standard'])
    files = [tracked, untracked]
      .filter(r => r.ok && r.out)
      .flatMap(r => r.out.split('\n'))
  }
  return [...new Set(files.map(f => f.replace(/^"(.+)"$/, '$1')))]
    .filter(f => f && fs.existsSync(path.join(root, f)))
}

/**
 * Parses `git log --format=%x01%H%x09%an%x09%s --numstat` output: each commit
 * opens with \x01hash\tauthor\tsubject, followed by `added\tdeleted\tpath`
 * numstat lines (binary files report `-`, counted as zero churn).
 */
export function parseHistory(raw) {
  const commits = []
  let current = null

  for (const line of (raw || '').split(/\r?\n/)) {
    if (line.startsWith('\x01')) {
      const [hash, author, ...subject] = line.slice(1).split('\t')
      current = { hash, author, subject: subject.join('\t'), files: [] }
      commits.push(current)
      continue
    }
    if (!current || !line.trim()) continue
    const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)
    if (!m) continue
    current.files.push({
      path: m[3].trim(),
      added: m[1] === '-' ? 0 : parseInt(m[1], 10),
      deleted: m[2] === '-' ? 0 : parseInt(m[2], 10),
    })
  }
  return commits
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Fix history is the strongest single predictor, so it weighs 3× a plain
 * touch; churn is damped so a generated lockfile doesn't outrank a hot module.
 */
export function scoreFile({ commits, fixes, churn }) {
  return commits + 3 * fixes + churn / 200
}

export function classify(stats) {
  if (stats.commits === 0) return 'new'
  const score = scoreFile(stats)
  if (stats.fixes >= 3 || score >= 15) return 'high'
  if (stats.fixes >= 1 || score >= 6) return 'medium'
  return 'low'
}

/** Aggregates the parsed history into one row per target file. */
export function aggregate(commits, files) {
  const rows = files.map(file => ({
    file, commits: 0, fixes: 0, churn: 0, authors: new Set(),
  }))
  const byPath = new Map(rows.map(r => [r.file, r]))

  for (const commit of commits) {
    const isFix = isFixSubject(commit.subject)
    for (const f of commit.files) {
      const row = byPath.get(f.path)
      if (!row) continue
      row.commits++
      row.churn += f.added + f.deleted
      row.authors.add(commit.author)
      if (isFix) row.fixes++
    }
  }

  return rows
    .map(r => {
      const stats = { file: r.file, commits: r.commits, fixes: r.fixes, churn: r.churn, authors: r.authors.size }
      return { ...stats, score: Math.round(scoreFile(stats) * 10) / 10, risk: classify(stats) }
    })
    .sort((a, b) => b.score - a.score)
}

// ─── Main computation ────────────────────────────────────────────────────────

/**
 * With fewer than this many commits in the window the percentiles behind the
 * thresholds mean little — the caller is told the signal is weak rather than
 * being handed a confident low.
 */
const SPARSE_THRESHOLD = 20

export function computeRisk({ root = process.cwd(), base, files, window: windowSpec = '6m' } = {}) {
  const since = parseWindow(windowSpec)
  if (!since) return { error: `Invalid --window "${windowSpec}" — use Nd, Nw, Nm or Ny (e.g. 90d, 6m, 1y).` }

  if (!git(root, ['rev-parse', '--git-dir']).ok) {
    return { error: 'Not a git repository — the risk signal is built from git history.' }
  }

  const resolvedBase = base || readDefaultBranch(root) || 'main'
  const source = files && files.length > 0 ? 'args' : 'diff'
  const targets = source === 'args'
    ? files.filter(f => fs.existsSync(path.join(root, f)))
    : changedFiles(root, resolvedBase)

  if (targets.length === 0) {
    return { error: `No files to score — nothing changed against ${resolvedBase} and no files were named.` }
  }

  const log = git(root, [
    'log', `--since=${since}`, '--no-renames', '--numstat',
    '--format=%x01%H%x09%an%x09%s', '--', ...targets,
  ])
  if (!log.ok) return { error: 'git log failed — cannot build the risk signal.' }

  const history = parseHistory(log.out)
  return {
    base: resolvedBase,
    window: windowSpec,
    since,
    source,
    sparse: history.length < SPARSE_THRESHOLD,
    files: aggregate(history, targets),
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

// Same visible width per label, so the numeric columns line up under the header.
const RISK_LABEL = {
  high:   `${c.red}${c.bold}HIGH${c.reset}    `,
  medium: `${c.yellow}MEDIUM${c.reset}  `,
  low:    `${c.dim}low${c.reset}     `,
  new:    `${c.cyan}new${c.reset}     `,
}

export function runRisk(argv, { root = process.cwd() } = {}) {
  const files = []
  let base, windowSpec = '6m', json = false

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--base') base = argv[++i]
    else if (a === '--window') windowSpec = argv[++i]
    else if (a === '--json') json = true
    else if (!a.startsWith('-')) files.push(a)
  }

  const result = computeRisk({ root, base, files, window: windowSpec })

  if (result.error) {
    if (json) { console.log(JSON.stringify({ error: result.error })) } else fail(result.error)
    return 1
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2))
    return 0
  }

  console.log()
  console.log(`${c.bold}  risk${c.reset}  ${c.dim}base ${result.base} · window ${result.window} · ${result.files.length} file(s) from ${result.source === 'args' ? 'arguments' : 'diff'}${c.reset}`)
  console.log()

  console.log(`${c.dim}  RISK    COMMITS  FIXES  CHURN  AUTHORS  FILE${c.reset}`)
  for (const f of result.files) {
    const cols = [
      String(f.commits).padStart(7),
      String(f.fixes).padStart(5),
      String(f.churn).padStart(5),
      String(f.authors).padStart(7),
    ].join('  ')
    console.log(`  ${RISK_LABEL[f.risk]}${cols}  ${f.file}`)
  }
  console.log()

  if (result.sparse) {
    warn(`Sparse history in this window — the signal is weak. Widen it: --window 12m.`)
  }
  info('Churn and fix history predict where defects cluster — start the deep review at the top.')
  dim('"new" means no history in the window: review as new code, not as low risk.')
  console.log()
  return 0
}
