/**
 * Plan verifier — closes the loop on specs/<slug>/plan.md and tasks.md.
 *
 * /ak:plan writes steps as checkboxes, each carrying the command that proves
 * it done. SDD tools (sdd-creator) write specs/<slug>/tasks.md in the same
 * checkbox grammar. This runs those commands and ticks a box only when its
 * command exits 0, so progress recorded in the file is progress that was
 * demonstrated rather than asserted.
 *
 * When both files exist for a slug, tasks.md is preferred (it is the SDD
 * execution artifact); --plan forces plan.md.
 *
 *   npx ai-workflow-kit verify [slug]      run the next unchecked step
 *     --all       run every remaining step, stopping at the first failure
 *     --recheck   re-run already-ticked steps to catch regressions
 *     --final     re-run every step's Verify plus the global checks recorded
 *                 in .ak/config.md (Test/Lint/Typecheck/Build/E2E); read-only
 *     --plan      prefer plan.md when tasks.md also exists
 *     --dry-run   print what would run, execute nothing
 *     --yes / -y  don't prompt before executing
 *
 * SAFETY: the commands come from a markdown file in the working tree. A
 * `specs/` directory from a repo you don't trust can run anything your shell
 * can. That's why execution prompts by default.
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { spawnSync } from 'child_process'

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
}
const ok   = (s) => console.log(`${c.green}✓${c.reset}  ${s}`)
const warn = (s) => console.log(`${c.yellow}⚠${c.reset}  ${s}`)
const fail = (s) => console.log(`${c.red}✗${c.reset}  ${s}`)
const info = (s) => console.log(`${c.cyan}ℹ${c.reset}  ${s}`)
const dim  = (s) => console.log(`${c.dim}  ${s}${c.reset}`)

// ─── Parsing ─────────────────────────────────────────────────────────────────

const CHECKBOX = /^(\s*)- \[([ xX])\]\s*(.*)$/
const VERIFY   = /^\s*Verify:\s*`(.+?)`\s*$/

/**
 * A step is a checkbox line plus the first `Verify:` line beneath it, before
 * the next checkbox. A checkbox with no Verify is still a step — it just
 * can't be machine-checked, and the runner refuses to tick it.
 */
export function parsePlan(text) {
  const lines = text.split(/\r?\n/)
  const steps = []

  lines.forEach((line, i) => {
    const m = line.match(CHECKBOX)
    if (!m) return

    let verify = null
    for (let j = i + 1; j < lines.length; j++) {
      if (CHECKBOX.test(lines[j])) break
      const v = lines[j].match(VERIFY)
      if (v) { verify = v[1].trim(); break }
    }

    steps.push({
      line: i,
      done: m[2].toLowerCase() === 'x',
      title: m[3].trim(),
      verify,
    })
  })

  const statusLine = lines.findIndex(l => /^Status:/i.test(l))
  return { lines, steps, statusLine }
}

export function tick(lines, lineNo) {
  const next = [...lines]
  next[lineNo] = next[lineNo].replace(/- \[ \]/, '- [x]')
  return next
}

export function setStatus(lines, statusLine, value) {
  if (statusLine < 0) return lines
  const next = [...lines]
  next[statusLine] = `Status: ${value}`
  return next
}

// ─── Project config (.ak/config.md) ─────────────────────────────────────────

/**
 * Global checks --final runs after the per-task Verifies, in this order.
 * They come from the `## Commands` section /ak:setup writes — `- Key: value`
 * bullets. A value starting with "unknown" means setup couldn't find one.
 */
const CONFIG_KEYS = ['Test', 'Lint', 'Typecheck', 'Build', 'E2E']

export function parseConfigCommands(root = process.cwd()) {
  const file = path.join(root, '.ak', 'config.md')
  if (!fs.existsSync(file)) return []

  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  const found = []
  let inCommands = false

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/)
    if (heading) { inCommands = /^commands$/i.test(heading[1]); continue }
    if (!inCommands) continue

    const m = line.match(/^\s*-\s*([A-Za-z0-9 ]+?):\s*(.+?)\s*$/)
    if (!m) continue

    const key = CONFIG_KEYS.find(k => k.toLowerCase() === m[1].trim().toLowerCase())
    if (!key) continue

    const value = m[2].trim().replace(/^`(.+)`$/, '$1')
    if (/^unknown\b/i.test(value)) continue

    found.push({ key, command: value })
  }

  return found.sort((a, b) => CONFIG_KEYS.indexOf(a.key) - CONFIG_KEYS.indexOf(b.key))
}

// ─── Spec discovery ──────────────────────────────────────────────────────────

/**
 * A slug is runnable when specs/<slug>/ holds tasks.md or plan.md. tasks.md
 * wins by default — it's the SDD execution artifact; plan.md is the /ak:plan
 * lightweight flow. preferPlan flips that for slugs that have both.
 */
export function findPlans(root = process.cwd(), { preferPlan = false } = {}) {
  const specs = path.join(root, 'specs')
  if (!fs.existsSync(specs)) return []
  return fs.readdirSync(specs)
    .map(slug => {
      const dir = path.join(specs, slug)
      if (!fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return null
      const tasks = path.join(dir, 'tasks.md')
      const plan  = path.join(dir, 'plan.md')
      const hasTasks = fs.existsSync(tasks)
      const hasPlan  = fs.existsSync(plan)
      if (!hasTasks && !hasPlan) return null
      const useTasks = hasTasks && !(preferPlan && hasPlan)
      return { slug, file: useTasks ? tasks : plan, kind: useTasks ? 'tasks' : 'plan' }
    })
    .filter(Boolean)
    .sort((a, b) => a.slug.localeCompare(b.slug))
}

/**
 * Returns { plan } to run, { code } to exit with immediately, or both absent
 * on an error. Auto-discovery looks for different things per mode: running
 * needs a plan with work left, re-checking needs one with ticked steps, and
 * a final verification takes any slug with steps — but never guesses between
 * two.
 */
function resolvePlan(slug, root, { recheck = false, final = false, preferPlan = false } = {}) {
  const plans = findPlans(root, { preferPlan })

  if (plans.length === 0) {
    fail('No specs/<slug>/tasks.md or plan.md found.')
    dim('Run the plan skill (or your SDD tool) first — it writes the file this command executes.')
    return { code: 1 }
  }

  if (slug) {
    const hit = plans.find(p => p.slug === slug)
    if (!hit) {
      fail(`No spec for "${slug}".`)
      dim(`Available: ${plans.map(p => p.slug).join(', ')}`)
      return { code: 1 }
    }
    return { plan: hit }
  }

  const wanted = plans.filter(p => {
    if (final) return true
    const { steps } = parsePlan(fs.readFileSync(p.file, 'utf8'))
    return recheck ? steps.some(s => s.done) : steps.some(s => !s.done)
  })

  if (wanted.length === 1) return { plan: wanted[0] }

  if (wanted.length === 0) {
    ok(recheck ? 'No spec has any ticked steps to re-check.' : 'Every spec is fully checked off.')
    return { code: 0 }
  }

  fail(`${wanted.length} specs match — name one.`)
  wanted.forEach(p => dim(`ai-workflow-kit verify ${p.slug}${final ? ' --final' : recheck ? ' --recheck' : ''}`))
  return { code: 1 }
}

// ─── Execution ───────────────────────────────────────────────────────────────

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(`  ${question} ${c.dim}[y/N]${c.reset} `, ans => {
      rl.close()
      resolve(/^(y|yes|s|si)$/i.test(ans.trim()))
    })
  })
}

function runCommand(command, cwd) {
  const res = spawnSync(command, { shell: true, stdio: 'inherit', cwd })
  return res.status === 0
}

// ─── Final verification ──────────────────────────────────────────────────────

/**
 * Final Verify: every step's Verify re-runs (ticked ones included, to catch
 * regressions), then the global checks from .ak/config.md. Read-only — no box
 * is ticked and no Status line is written; a feature is not "done" because
 * --final happened to pass once, it's done when the file says so and this
 * still agrees.
 */
async function runFinal(plan, root, { DRY, YES }) {
  const raw = fs.readFileSync(plan.file, 'utf8')
  const { steps } = parsePlan(raw)

  if (steps.length === 0) {
    warn(`${path.relative(root, plan.file)} has no checkbox steps.`)
    return 1
  }

  const checkable    = steps.filter(s => s.verify)
  const unverifiable = steps.filter(s => !s.verify)
  const globals      = parseConfigCommands(root)

  console.log()
  console.log(`${c.bold}  ${plan.slug}${c.reset}  ${c.dim}${path.relative(root, plan.file).replaceAll('\\', '/')}${c.reset}`)
  info(`Final verification: ${checkable.length} task check(s) + ${globals.length} global check(s) from .ak/config.md`)
  if (unverifiable.length > 0) {
    warn(`${unverifiable.length} step(s) have no \`Verify:\` command and cannot be machine-checked.`)
  }
  console.log()

  if (checkable.length === 0 && globals.length === 0) {
    fail('Nothing verifiable — no `Verify:` lines and no .ak/config.md commands.')
    return 1
  }

  if (DRY) {
    checkable.forEach(s => { console.log(`${c.bold}  task:${c.reset} ${s.title}`); dim(`$ ${s.verify}`) })
    globals.forEach(g => { console.log(`${c.bold}  ${g.key}:${c.reset}`); dim(`$ ${g.command}`) })
    console.log()
    info(`Dry run — ${checkable.length + globals.length} command(s) shown, nothing executed.`)
    return 0
  }

  if (!YES) {
    const go = await confirm('Run them?')
    if (!go) { info('Skipped.'); console.log(); return 0 }
    console.log()
  }

  let taskPass = 0, taskFail = 0, regressions = 0

  for (const step of checkable) {
    console.log(`${c.bold}  task:${c.reset} ${step.title}`)
    dim(`$ ${step.verify}`)
    console.log()
    const passed = runCommand(step.verify, root)
    console.log()
    if (passed) {
      taskPass++
      ok('PASS')
    } else {
      taskFail++
      if (step.done) {
        regressions++
        fail('Regression — this step was ticked but its Verify no longer passes.')
      } else {
        fail('FAIL — this step was never completed.')
      }
    }
    console.log()
  }

  const globalResults = []
  for (const g of globals) {
    console.log(`${c.bold}  ${g.key}:${c.reset}`)
    dim(`$ ${g.command}`)
    console.log()
    const passed = runCommand(g.command, root)
    console.log()
    globalResults.push({ key: g.key, passed })
    if (passed) ok('PASS'); else fail('FAIL')
    console.log()
  }

  // Summary
  const allPassed = taskFail === 0 && globalResults.every(r => r.passed)
  const pad = (s) => s.padEnd(12)

  console.log(`${c.bold}  Final Verification${c.reset}`)
  console.log()
  const tasksNote = unverifiable.length > 0 ? ` ${c.dim}(${unverifiable.length} unverifiable skipped)${c.reset}` : ''
  console.log(`  ${pad('Tasks')}${taskPass}/${checkable.length} ${taskFail === 0 ? `${c.green}PASS${c.reset}` : `${c.red}FAIL${c.reset}`}${tasksNote}`)
  for (const r of globalResults) {
    console.log(`  ${pad(r.key)}${r.passed ? `${c.green}PASS${c.reset}` : `${c.red}FAIL${c.reset}`}`)
  }
  if (regressions > 0) console.log(`  ${pad('Regressions')}${c.red}${regressions}${c.reset}`)
  console.log()
  console.log(`  Result: ${allPassed ? `${c.green}${c.bold}PASS${c.reset}` : `${c.red}${c.bold}FAIL${c.reset}`}`)
  console.log()

  return allPassed ? 0 : 1
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function runVerify(argv, { root = process.cwd() } = {}) {
  const flags = new Set(argv.filter(a => a.startsWith('-')))
  const slug  = argv.find(a => !a.startsWith('-'))

  const ALL     = flags.has('--all')
  const RECHECK = flags.has('--recheck')
  const DRY     = flags.has('--dry-run')
  const YES     = flags.has('--yes') || flags.has('-y')
  const FINAL   = flags.has('--final')
  const PLAN    = flags.has('--plan')

  const resolved = resolvePlan(slug, root, { recheck: RECHECK, final: FINAL, preferPlan: PLAN })
  if (!resolved.plan) return resolved.code ?? 1
  const plan = resolved.plan

  if (FINAL) return runFinal(plan, root, { DRY, YES })

  const raw = fs.readFileSync(plan.file, 'utf8')
  let { lines, steps, statusLine } = parsePlan(raw)

  if (steps.length === 0) {
    warn(`${path.relative(root, plan.file)} has no checkbox steps.`)
    return 1
  }

  console.log()
  console.log(`${c.bold}  ${plan.slug}${c.reset}  ${c.dim}${path.relative(root, plan.file).replaceAll('\\', '/')}${c.reset}`)
  const doneCount = steps.filter(s => s.done).length
  info(`${doneCount}/${steps.length} steps checked off`)
  console.log()

  const queue = RECHECK
    ? steps.filter(s => s.done)
    : (ALL ? steps.filter(s => !s.done) : steps.filter(s => !s.done).slice(0, 1))

  if (queue.length === 0) {
    ok(RECHECK ? 'No ticked steps to re-check.' : 'Nothing left to run — every step is checked off.')
    return 0
  }

  let ran = 0, failed = 0

  for (const step of queue) {
    console.log(`${c.bold}  ${step.done ? 're-check' : 'step'}:${c.reset} ${step.title}`)

    if (!step.verify) {
      warn('No `Verify:` command — cannot confirm this step. Skipping.')
      dim(`Add one to the step in ${plan.kind === 'tasks' ? 'tasks.md' : 'plan.md'}, or fold it into a step that produces something checkable.`)
      console.log()
      if (!ALL && !RECHECK) return 1
      continue
    }

    dim(`$ ${step.verify}`)

    if (DRY) { console.log(); ran++; continue }

    if (!YES) {
      const go = await confirm('Run it?')
      if (!go) { info('Skipped.'); console.log(); return 0 }
    }

    console.log()
    const passed = runCommand(step.verify, root)
    ran++
    console.log()

    if (!passed) {
      failed++
      if (RECHECK) {
        fail('Regression — this step was ticked but its Verify no longer passes.')
        dim('The box is left as it is; decide whether to fix the code or the plan.')
      } else {
        fail('Verify failed — leaving the box unticked.')
      }
      console.log()
      break
    }

    if (RECHECK) {
      ok('Still passing.')
    } else {
      lines = tick(lines, step.line)
      fs.writeFileSync(plan.file, lines.join('\n'))
      ok(`Ticked: ${step.title}`)
    }
    console.log()
  }

  // Refresh status from what the file now says.
  if (!DRY && !RECHECK && failed === 0) {
    const fresh = parsePlan(fs.readFileSync(plan.file, 'utf8'))
    const allDone = fresh.steps.every(s => s.done)
    const next = setStatus(fresh.lines, fresh.statusLine, allDone ? 'done' : 'in progress')
    fs.writeFileSync(plan.file, next.join('\n'))
    if (allDone) ok(`${plan.slug} is complete — every step verified.`)
  }

  if (DRY) info(`Dry run — ${ran} command(s) shown, nothing executed.`)
  return failed > 0 ? 1 : 0
}
