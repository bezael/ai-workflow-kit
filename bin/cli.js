#!/usr/bin/env node
/**
 * AI Workflow Kit — CLI installer
 *
 * Usage:
 *   npx ai-workflow-kit              → interactive selection menu
 *   npx ai-workflow-kit --yes        → install everything without prompting
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

// ─── Paths ───────────────────────────────────────────────────────────────────
const __dir      = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT  = path.resolve(__dir, '..')
const CLAUDE     = path.join(os.homedir(), '.claude')
const SKILLS_DST = path.join(CLAUDE, 'skills')
const AGENTS_DST = path.join(CLAUDE, 'agents')
const HOOKS_DST  = path.join(CLAUDE, 'hooks')
const SETTINGS   = path.join(CLAUDE, 'settings.json')

// ─── Args ────────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2)
const SKILLS_ONLY = args.includes('--skills')
const HOOKS_ONLY  = args.includes('--hooks')
const YES         = args.includes('--yes') || args.includes('-y')
const UNINSTALL   = args.includes('--uninstall')
const LIST        = args.includes('--list')

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

// ─── Selection menu ──────────────────────────────────────────────────────────

function renderMenu(allSkills, allAgents, allHooks) {
  const numWidth = String(allSkills.length + allAgents.length + allHooks.length).length

  function grid(items, startNum) {
    const cols = 3
    const colW  = 14
    for (let i = 0; i < items.length; i += cols) {
      const row = items.slice(i, i + cols)
      const line = row.map(({ num, name }) => {
        const label = `${String(num).padStart(numWidth)}  ${c.cyan}${name}${c.reset}`
        // strip ANSI for length calculation
        const rawLen = String(num).padStart(numWidth).length + 2 + name.length
        return label + ' '.repeat(Math.max(1, colW - rawLen))
      }).join('  ')
      console.log('  ' + line)
    }
  }

  let n = 1
  const skillItems  = allSkills.map(s  => ({ num: n++, name: s.name,            item: s,  type: 'skill' }))
  const agentItems  = allAgents.map(a  => ({ num: n++, name: a.name,            item: a,  type: 'agent' }))
  const hookItems   = allHooks.map(h   => ({ num: n++, name: path.basename(h, '.sh'), item: h, type: 'hook'  }))

  console.log(`\n${c.bold}  What would you like to install?${c.reset}\n`)

  console.log(`  ${c.bold}SKILLS${c.reset}`)
  grid(skillItems)
  console.log()

  console.log(`  ${c.bold}AGENTS${c.reset}`)
  grid(agentItems)
  console.log()

  console.log(`  ${c.bold}HOOKS${c.reset}`)
  grid(hookItems)
  console.log()

  console.log(`  ${c.dim}Shortcuts: [a] all  [s] all skills  [ag] all agents  [h] all hooks${c.reset}`)
  console.log()

  return { skillItems, agentItems, hookItems }
}

async function selectItems(allSkills, allAgents, allHooks) {
  const { skillItems, agentItems, hookItems } = renderMenu(allSkills, allAgents, allHooks)
  const allItems = [...skillItems, ...agentItems, ...hookItems]

  const input = await prompt(`  Enter numbers or shortcuts ${c.dim}(e.g. "1 3 5" or "s h")${c.reset}: `)

  if (!input) return { skills: [], agents: [], hooks: [] }

  const tokens  = input.toLowerCase().split(/[\s,]+/).filter(Boolean)
  const skills  = new Set()
  const agents  = new Set()
  const hooks   = new Set()

  for (const token of tokens) {
    if (token === 'a' || token === 'all') {
      return { skills: allSkills, agents: allAgents, hooks: allHooks }
    }
    if (token === 's' || token === 'skills') {
      allSkills.forEach(s => skills.add(s)); continue
    }
    if (token === 'ag' || token === 'agents') {
      allAgents.forEach(a => agents.add(a)); continue
    }
    if (token === 'h' || token === 'hooks') {
      allHooks.forEach(h => hooks.add(h)); continue
    }
    const num   = parseInt(token, 10)
    const found = allItems.find(i => i.num === num)
    if (found) {
      if (found.type === 'skill') skills.add(found.item)
      if (found.type === 'agent') agents.add(found.item)
      if (found.type === 'hook')  hooks.add(found.item)
    }
  }

  return { skills: [...skills], agents: [...agents], hooks: [...hooks] }
}

// ─── Header ──────────────────────────────────────────────────────────────────
console.log()
console.log(`${c.bold}  AI Workflow Kit${c.reset}  ${c.dim}v${JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version}${c.reset}`)
console.log(`  ${c.dim}Skills · Agents · Hooks for Claude Code, Cursor & Copilot${c.reset}`)
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
  // --skills wins over --yes: scope to skills + agents only
  selectedSkills = allSkills
  selectedAgents = allAgents
} else if (HOOKS_ONLY) {
  // --hooks wins over --yes: scope to hooks only
  selectedHooks = allHooks
} else if (YES) {
  // --yes with no scope flag: install everything
  selectedSkills = allSkills
  selectedAgents = allAgents
  selectedHooks  = allHooks
} else {
  // Interactive selection menu
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

// Skills → ~/.claude/skills/
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

// Agents → ~/.claude/agents/ (flat .md files)
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

// Hooks → ~/.claude/hooks/ + configure settings.json
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
    const template    = fs.readFileSync(path.join(REPO_ROOT, 'hooks', 'settings.template.json'), 'utf8')
    const hooksDstJson = HOOKS_DST.replace(/\\/g, '/')
    const configured  = template.replace(/~\/\.claude\/hooks/g, hooksDstJson)
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
