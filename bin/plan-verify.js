/**
 * Plan verifier — closes the loop on specs/<slug>/plan.md.
 *
 * /ak:plan writes steps as checkboxes, each carrying the command that proves
 * it done. This runs those commands and ticks a box only when its command
 * exits 0, so progress recorded in the file is progress that was demonstrated
 * rather than asserted.
 *
 *   npx ai-workflow-kit verify [slug]      run the next unchecked step
 *     --all       run every remaining step, stopping at the first failure
 *     --recheck   re-run already-ticked steps to catch regressions
 *     --dry-run   print what would run, execute nothing
 *     --yes       don't prompt before executing
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

// ─── Plan discovery ──────────────────────────────────────────────────────────

export function findPlans(root = process.cwd()) {
  const specs = path.join(root, 'specs')
  if (!fs.existsSync(specs)) return []
  return fs.readdirSync(specs)
    .map(slug => ({ slug, file: path.join(specs, slug, 'plan.md') }))
    .filter(p => fs.existsSync(p.file))
    .sort((a, b) => a.slug.localeCompare(b.slug))
}

/**
 * Returns { plan } to run, { code } to exit with immediately, or both absent
 * on an error. Auto-discovery looks for different things per mode: running
 * needs a plan with work left, re-checking needs one with ticked steps.
 */
function resolvePlan(slug, root, { recheck = false } = {}) {
  const plans = findPlans(root)

  if (plans.length === 0) {
    fail('No specs/<slug>/plan.md found.')
    dim('Run the plan skill first — it writes the plan this command executes.')
    return { code: 1 }
  }

  if (slug) {
    const hit = plans.find(p => p.slug === slug)
    if (!hit) {
      fail(`No plan for "${slug}".`)
      dim(`Available: ${plans.map(p => p.slug).join(', ')}`)
      return { code: 1 }
    }
    return { plan: hit }
  }

  const wanted = plans.filter(p => {
    const { steps } = parsePlan(fs.readFileSync(p.file, 'utf8'))
    return recheck ? steps.some(s => s.done) : steps.some(s => !s.done)
  })

  if (wanted.length === 1) return { plan: wanted[0] }

  if (wanted.length === 0) {
    ok(recheck ? 'No plan has any ticked steps to re-check.' : 'Every plan is fully checked off.')
    return { code: 0 }
  }

  fail(`${wanted.length} plans match — name one.`)
  wanted.forEach(p => dim(`ai-workflow-kit verify ${p.slug}${recheck ? ' --recheck' : ''}`))
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

function runCommand(command) {
  const res = spawnSync(command, { shell: true, stdio: 'inherit' })
  return res.status === 0
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function runVerify(argv, { root = process.cwd() } = {}) {
  const flags = new Set(argv.filter(a => a.startsWith('--')))
  const slug  = argv.find(a => !a.startsWith('--'))

  const ALL     = flags.has('--all')
  const RECHECK = flags.has('--recheck')
  const DRY     = flags.has('--dry-run')
  const YES     = flags.has('--yes') || flags.has('-y')

  const resolved = resolvePlan(slug, root, { recheck: RECHECK })
  if (!resolved.plan) return resolved.code ?? 1
  const plan = resolved.plan

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
      dim('Add one to the step in plan.md, or fold it into a step that produces something checkable.')
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
    const passed = runCommand(step.verify)
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
