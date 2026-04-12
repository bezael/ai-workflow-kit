#!/usr/bin/env node
/**
 * AI Workflow Kit — CLI installer
 *
 * Usage:
 *   npx ai-workflow-kit              → interactive selection menu
 *   npx ai-workflow-kit --yes        → install everything without prompting
 *   npx ai-workflow-kit --local      → install into .claude/ of the current project
 *   npx ai-workflow-kit --global     → install into ~/.claude/ (default)
 *   npx ai-workflow-kit --skills     → all skills and agents only
 *   npx ai-workflow-kit --hooks      → all hooks only
 *   npx ai-workflow-kit --uninstall  → remove what was installed
 *   npx ai-workflow-kit --list       → show what would be installed
 */

import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import readline from 'readline'

// ─── Colors ──────────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  dim:    '\x1b[2m',
}
const ok   = (s) => console.log(`${c.green}✓${c.reset}  ${s}`)
const warn = (s) => console.log(`${c.yellow}⚠${c.reset}  ${s}`)
const info = (s) => console.log(`${c.cyan}ℹ${c.reset}  ${s}`)
const step = (s) => console.log(`\n${c.bold}${c.cyan}→ ${s}${c.reset}`)
const dim  = (s) => console.log(`${c.dim}  ${s}${c.reset}`)

// ─── Args ────────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2)
const SKILLS_ONLY = args.includes('--skills')
const HOOKS_ONLY  = args.includes('--hooks')
const YES         = args.includes('--yes') || args.includes('-y')
const UNINSTALL   = args.includes('--uninstall')
const LIST        = args.includes('--list')
const FORCE_LOCAL  = args.includes('--local')
const FORCE_GLOBAL = args.includes('--global')

// ─── Paths ───────────────────────────────────────────────────────────────────
const __dir     = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dir, '..')

function resolvePaths(isLocal) {
  const base = isLocal
    ? path.join(process.cwd(), '.claude')
    : path.join(os.homedir(), '.claude')
  return {
    SKILLS_DST: path.join(base, 'skills'),
    AGENTS_DST: path.join(base, 'agents'),
    HOOKS_DST:  path.join(base, 'hooks'),
    SETTINGS:   path.join(base, 'settings.json'),
    base,
  }
}

// ─── Discovery ───────────────────────────────────────────────────────────────

// { src, name, isDir } — supports flat <name>.md and <name>/SKILL.md dirs
function listSkills(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).flatMap(entry => {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      const md = path.join(full, 'SKILL.md')
      if (fs.existsSync(md)) return [{ src: full, name: entry, isDir: true }]
      return []
    }
    if (entry.endsWith('.md')) return [{ src: full, name: path.basename(entry, '.md'), isDir: false }]
    return []
  })
}

// { src, name } — supports flat <name>.md and <name>/AGENT.md dirs
// Always installed as flat files to ~/.claude/agents/<name>.md
function listAgents(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).flatMap(entry => {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      const md = path.join(full, 'AGENT.md')
      if (fs.existsSync(md)) return [{ src: md, name: entry }]
      return []
    }
    if (entry.endsWith('.md')) return [{ src: full, name: path.basename(entry, '.md') }]
    return []
  })
}

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => f.endsWith(ext)).map(f => path.join(dir, f))
}

// ─── File ops ────────────────────────────────────────────────────────────────

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.copyFileSync(src, dst)
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true })
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry)
    const d = path.join(dst, entry)
    fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d)
  }
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, ans => { rl.close(); resolve(ans.trim()) })
  })
}

async function ask(question) {
  if (YES) return true
  const ans = await prompt(`  ${question} ${c.dim}[s/N]${c.reset} `)
  return ans.toLowerCase() === 's' || ans.toLowerCase() === 'y'
}

// ─── Selection — step 1: categories ─────────────────────────────────────────

async function selectCategories(allSkills, allAgents, allHooks) {
  const skillNames = allSkills.map(s => s.name).join(', ')
  const agentNames = allAgents.map(a => a.name).join(', ')
  const hookNames  = allHooks.map(h => path.basename(h, '.sh')).join(', ')

  console.log(`\n${c.bold}  What would you like to install?${c.reset}\n`)
  console.log(`  ${c.cyan}s${c.reset}   Skills    ${c.dim}${skillNames}${c.reset}`)
  console.log(`  ${c.cyan}ag${c.reset}  Agents    ${c.dim}${agentNames}${c.reset}`)
  console.log(`  ${c.cyan}h${c.reset}   Hooks     ${c.dim}${hookNames}${c.reset}`)
  console.log(`  ${c.cyan}a${c.reset}   All of the above`)
  console.log()

  const input = await prompt(`  Enter categories ${c.dim}(e.g. "s h" or "a")${c.reset}: `)
  const tokens = input.toLowerCase().split(/[\s,]+/).filter(Boolean)

  if (!tokens.length) return { wantSkills: false, wantAgents: false, wantHooks: false }

  if (tokens.includes('a') || tokens.includes('all')) {
    return { wantSkills: true, wantAgents: true, wantHooks: true }
  }

  return {
    wantSkills: tokens.includes('s') || tokens.includes('skills'),
    wantAgents: tokens.includes('ag') || tokens.includes('agents'),
    wantHooks:  tokens.includes('h') || tokens.includes('hooks'),
  }
}

// ─── Selection — step 2: items within a category ────────────────────────────

async function selectItemsInCategory(items, getName) {
  const numWidth = String(items.length).length
  const cols = 3
  const colW = 16

  console.log()
  for (let i = 0; i < items.length; i += cols) {
    const row = items.slice(i, i + cols)
    const line = row.map((item, j) => {
      const n    = i + j + 1
      const name = getName(item)
      const label  = `  ${c.dim}${String(n).padStart(numWidth)}${c.reset}  ${c.cyan}${name}${c.reset}`
      const rawLen = 2 + String(n).padStart(numWidth).length + 2 + name.length
      return label + ' '.repeat(Math.max(1, colW - rawLen))
    }).join('')
    console.log(line)
  }
  console.log()

  const input = await prompt(`  Enter numbers or ${c.cyan}Enter${c.reset} for all: `)

  if (!input.trim()) return items

  const selected = new Set()
  for (const token of input.split(/[\s,]+/).filter(Boolean)) {
    const n = parseInt(token, 10)
    if (n >= 1 && n <= items.length) selected.add(items[n - 1])
  }
  return [...selected]
}

async function selectItems(allSkills, allAgents, allHooks) {
  const { wantSkills, wantAgents, wantHooks } = await selectCategories(allSkills, allAgents, allHooks)

  if (!wantSkills && !wantAgents && !wantHooks) return { skills: [], agents: [], hooks: [] }

  let skills = []
  let agents = []
  let hooks  = []

  if (wantSkills && allSkills.length > 0) {
    console.log(`\n  ${c.bold}SKILLS${c.reset}  — pick specific or Enter for all`)
    skills = await selectItemsInCategory(allSkills, s => s.name)
  }

  if (wantAgents && allAgents.length > 0) {
    console.log(`\n  ${c.bold}AGENTS${c.reset}  — pick specific or Enter for all`)
    agents = await selectItemsInCategory(allAgents, a => a.name)
  }

  if (wantHooks && allHooks.length > 0) {
    console.log(`\n  ${c.bold}HOOKS${c.reset}  — pick specific or Enter for all`)
    hooks = await selectItemsInCategory(allHooks, h => path.basename(h, '.sh'))
  }

  return { skills, agents, hooks }
}

// ─── Header ──────────────────────────────────────────────────────────────────
console.log()
console.log(`${c.bold}  AI Workflow Kit${c.reset}  ${c.dim}v${JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version}${c.reset}`)
console.log(`  ${c.dim}Skills · Agents · Hooks for Claude Code, Cursor, Antigravity & Copilot${c.reset}`)
console.log()

// ─── List ─────────────────────────────────────────────────────────────────────
if (LIST) {
  const skills = listSkills(path.join(REPO_ROOT, 'skills'))
  const agents = listAgents(path.join(REPO_ROOT, 'agents'))
  const hooks  = listFiles(path.join(REPO_ROOT, 'hooks'), '.sh')

  console.log(`${c.bold}Skills (${skills.length})${c.reset}`)
  skills.forEach(s => dim(`/${s.name}`))

  console.log(`\n${c.bold}Agents (${agents.length})${c.reset}`)
  agents.forEach(a => dim(`/${a.name}`))

  console.log(`\n${c.bold}Hooks (${hooks.length})${c.reset}`)
  hooks.forEach(f => dim(path.basename(f)))
  console.log()
  process.exit(0)
}

// ─── Resolve scope (local vs global) ─────────────────────────────────────────

let isLocal

if (FORCE_LOCAL) {
  isLocal = true
} else if (FORCE_GLOBAL) {
  isLocal = false
} else {
  // Interactive scope question
  console.log(`  ${c.bold}Where do you want to install?${c.reset}`)
  console.log(`  ${c.cyan}g${c.reset}  Global  ${c.dim}~/.claude/          — available in all projects${c.reset}`)
  console.log(`  ${c.cyan}l${c.reset}  Local   ${c.dim}.claude/ (here)     — this project only${c.reset}`)
  console.log()
  const scopeAns = YES ? 'g' : await prompt(`  ${c.dim}[g/l]${c.reset} `)
  isLocal = scopeAns.toLowerCase() === 'l'
  console.log()
}

const { SKILLS_DST, AGENTS_DST, HOOKS_DST, SETTINGS, base: CLAUDE_BASE } = resolvePaths(isLocal)
const scopeLabel = isLocal
  ? `local  ${c.dim}(.claude/)${c.reset}`
  : `global ${c.dim}(~/.claude/)${c.reset}`
info(`Scope: ${scopeLabel}`)

// ─── Uninstall ───────────────────────────────────────────────────────────────
if (UNINSTALL) {
  step('Uninstalling...')

  const skillsToRemove = listSkills(path.join(REPO_ROOT, 'skills')).map(s => ({
    dst: s.isDir ? path.join(SKILLS_DST, s.name) : path.join(SKILLS_DST, s.name + '.md'),
    isDir: s.isDir,
  }))
  const agentsToRemove = listAgents(path.join(REPO_ROOT, 'agents')).map(a => ({
    dst: path.join(AGENTS_DST, a.name + '.md'), isDir: false,
  }))
  const hooksToRemove = listFiles(path.join(REPO_ROOT, 'hooks'), '.sh').map(f => ({
    dst: path.join(HOOKS_DST, path.basename(f)), isDir: false,
  }))

  let removed = 0
  for (const item of [...skillsToRemove, ...agentsToRemove, ...hooksToRemove]) {
    if (!fs.existsSync(item.dst)) continue
    item.isDir
      ? fs.rmSync(item.dst, { recursive: true, force: true })
      : fs.unlinkSync(item.dst)
    removed++
  }

  ok(`Removed ${removed} items`)
  warn(`settings.json was NOT modified — edit manually if needed: ${SETTINGS}`)
  console.log()
  process.exit(0)
}

// ─── Resolve selection ────────────────────────────────────────────────────────

const claudeInstalled = spawnSync('claude', ['--version'], { shell: true }).status === 0
if (!claudeInstalled) {
  warn('Claude Code not found in PATH. Install it with:')
  dim('npm install -g @anthropic-ai/claude-code')
}

const allSkills = listSkills(path.join(REPO_ROOT, 'skills'))
const allAgents = listAgents(path.join(REPO_ROOT, 'agents'))
const allHooks  = listFiles(path.join(REPO_ROOT, 'hooks'), '.sh')

let selectedSkills = []
let selectedAgents = []
let selectedHooks  = []

if (SKILLS_ONLY) {
  selectedSkills = allSkills
  selectedAgents = allAgents
} else if (HOOKS_ONLY) {
  selectedHooks = allHooks
} else if (YES) {
  selectedSkills = allSkills
  selectedAgents = allAgents
  selectedHooks  = allHooks
} else {
  const sel = await selectItems(allSkills, allAgents, allHooks)
  selectedSkills = sel.skills
  selectedAgents = sel.agents
  selectedHooks  = sel.hooks

  if (selectedSkills.length + selectedAgents.length + selectedHooks.length === 0) {
    info('Nothing selected. Exiting.')
    console.log()
    process.exit(0)
  }
}

// ─── Install ─────────────────────────────────────────────────────────────────

let installedCount = 0

if (selectedSkills.length > 0) {
  step('Installing skills...')
  fs.mkdirSync(SKILLS_DST, { recursive: true })

  for (const entry of selectedSkills) {
    const dst = entry.isDir
      ? path.join(SKILLS_DST, entry.name)
      : path.join(SKILLS_DST, entry.name + '.md')

    if (fs.existsSync(dst) && !YES) {
      const overwrite = await ask(`/${entry.name} already exists. Overwrite?`)
      if (!overwrite) { info(`Skipped: ${entry.name}`); continue }
    }

    entry.isDir ? copyDir(entry.src, dst) : copyFile(entry.src, dst)
    ok(`skill: /${entry.name}`)
    installedCount++
  }
}

if (selectedAgents.length > 0) {
  step('Installing agents...')
  fs.mkdirSync(AGENTS_DST, { recursive: true })

  for (const agent of selectedAgents) {
    const dst = path.join(AGENTS_DST, agent.name + '.md')

    if (fs.existsSync(dst) && !YES) {
      const overwrite = await ask(`/${agent.name} already exists. Overwrite?`)
      if (!overwrite) { info(`Skipped: ${agent.name}`); continue }
    }

    copyFile(agent.src, dst)
    ok(`agent: /${agent.name}`)
    installedCount++
  }
}

if (selectedHooks.length > 0) {
  step('Installing hooks...')
  fs.mkdirSync(HOOKS_DST, { recursive: true })

  for (const src of selectedHooks) {
    const dst = path.join(HOOKS_DST, path.basename(src))
    copyFile(src, dst)
    try { fs.chmodSync(dst, 0o755) } catch {}
    ok(`hook: ${path.basename(src)}`)
    installedCount++
  }

  step('Configuring settings.json...')

  if (!fs.existsSync(SETTINGS)) {
    const template     = fs.readFileSync(path.join(REPO_ROOT, 'hooks', 'settings.template.json'), 'utf8')
    const hooksDstJson = HOOKS_DST.replace(/\\/g, '/')
    const configured   = template.replace(/~\/\.claude\/hooks/g, hooksDstJson)
    try {
      const cleaned = configured
        .replace(/\s*"_comment":[^\n]+,?\n/g, '\n')
        .replace(/\s*"_note":[^\n]+,?\n/g, '\n')
        .replace(/\s*"_docs":[^\n]+,?\n/g, '\n')
        .replace(/,(\s*[}\]])/g, '$1')
      fs.writeFileSync(SETTINGS, JSON.stringify(JSON.parse(cleaned), null, 2))
    } catch {
      fs.writeFileSync(SETTINGS, configured)
    }
    ok(`settings.json created: ${SETTINGS}`)
  } else {
    try {
      const existing = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'))
      if (!existing.hooks) existing.hooks = {}

      const newHooks = {
        PreToolUse: [{
          matcher: 'Bash',
          hooks: [
            { type: 'command', command: `bash ${HOOKS_DST}/pre-bash-safety.sh` },
            { type: 'command', command: `bash ${HOOKS_DST}/pre-commit-secrets.sh` },
          ]
        }],
        PostToolUse: [
          { matcher: 'Write', hooks: [{ type: 'command', command: `bash ${HOOKS_DST}/post-write-format.sh` }] },
          { matcher: 'Edit',  hooks: [
            { type: 'command', command: `bash ${HOOKS_DST}/post-write-format.sh` },
            { type: 'command', command: `bash ${HOOKS_DST}/post-edit-lint.sh` },
          ]},
        ],
        Stop: [{ matcher: '.*', hooks: [{ type: 'command', command: `bash ${HOOKS_DST}/notify-done.sh` }] }],
      }

      for (const [event, matchers] of Object.entries(newHooks)) {
        if (!existing.hooks[event]) existing.hooks[event] = []
        for (const m of matchers) {
          if (!existing.hooks[event].some(x => x.matcher === m.matcher))
            existing.hooks[event].push(m)
        }
      }

      fs.writeFileSync(SETTINGS, JSON.stringify(existing, null, 2))
      ok('Hooks merged into existing settings.json')
    } catch {
      warn(`Could not merge settings.json — edit manually: ${SETTINGS}`)
    }
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log()
console.log(`${c.bold}  ─────────────────────────────${c.reset}`)
console.log(`${c.bold}${c.green}  Installation complete${c.reset}  (${installedCount} items)`)
console.log(`${c.bold}  ─────────────────────────────${c.reset}`)
console.log()

if (selectedSkills.length > 0)
  console.log(`  ${c.dim}Skills:${c.reset}  ${selectedSkills.map(s => '/' + s.name).join('  ')}`)
if (selectedAgents.length > 0)
  console.log(`  ${c.dim}Agents:${c.reset}  ${selectedAgents.map(a => '/' + a.name).join('  ')}`)
if (selectedHooks.length > 0)
  console.log(`  ${c.dim}Hooks:${c.reset}   ${selectedHooks.map(h => path.basename(h, '.sh')).join('  ')}`)

console.log()
console.log('  Restart Claude Code to apply changes.')
console.log()
