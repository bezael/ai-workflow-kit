#!/usr/bin/env node
/**
 * AI Workflow Kit — CLI installer
 *
 * Usage:
 *   npx ai-workflow-kit              → install everything (interactive)
 *   npx ai-workflow-kit --skills     → skills and agents only
 *   npx ai-workflow-kit --hooks      → hooks only
 *   npx ai-workflow-kit --yes        → install everything without prompting
 *   npx ai-workflow-kit --uninstall  → remove what was installed
 *   npx ai-workflow-kit --list       → show what would be installed
 */

import { execSync, spawnSync } from 'child_process'
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
const ok    = (s) => console.log(`${c.green}✓${c.reset}  ${s}`)
const warn  = (s) => console.log(`${c.yellow}⚠${c.reset}  ${s}`)
const err   = (s) => console.log(`${c.red}✗${c.reset}  ${s}`)
const info  = (s) => console.log(`${c.cyan}ℹ${c.reset}  ${s}`)
const step  = (s) => console.log(`\n${c.bold}${c.cyan}→ ${s}${c.reset}`)
const dim   = (s) => console.log(`${c.dim}  ${s}${c.reset}`)

// ─── Paths ───────────────────────────────────────────────────────────────────
const __dir     = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dir, '..')
const CLAUDE    = path.join(os.homedir(), '.claude')
const SKILLS_DST = path.join(CLAUDE, 'skills')
const HOOKS_DST  = path.join(CLAUDE, 'hooks')
const SETTINGS   = path.join(CLAUDE, 'settings.json')

// ─── Args ────────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2)
const SKILLS_ONLY = args.includes('--skills')
const HOOKS_ONLY  = args.includes('--hooks')
const YES         = args.includes('--yes') || args.includes('-y')
const UNINSTALL   = args.includes('--uninstall')
const LIST        = args.includes('--list')

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Returns { src, name, isDir } for each skill in dir.
// Supports both flat `<name>.md` files and `<name>/SKILL.md` directories.
function listSkills(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).flatMap(entry => {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      const skillMd = path.join(full, 'SKILL.md')
      if (fs.existsSync(skillMd)) return [{ src: full, name: entry, isDir: true }]
      return []
    }
    if (entry.endsWith('.md')) return [{ src: full, name: path.basename(entry, '.md'), isDir: false }]
    return []
  })
}

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => f.endsWith(ext)).map(f => path.join(dir, f))
}

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.copyFileSync(src, dst)
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true })
  for (const entry of fs.readdirSync(src)) {
    const srcEntry = path.join(src, entry)
    const dstEntry = path.join(dst, entry)
    if (fs.statSync(srcEntry).isDirectory()) {
      copyDir(srcEntry, dstEntry)
    } else {
      fs.copyFileSync(srcEntry, dstEntry)
    }
  }
}

async function ask(question) {
  if (YES) return true
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(`  ${question} ${c.dim}[s/N]${c.reset} `, ans => {
      rl.close()
      resolve(ans.toLowerCase() === 's' || ans.toLowerCase() === 'y')
    })
  })
}

// ─── Header ──────────────────────────────────────────────────────────────────
console.log()
console.log(`${c.bold}  AI Workflow Kit${c.reset}  ${c.dim}v${JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version}${c.reset}`)
console.log(`  ${c.dim}Skills · Agents · Hooks for Claude Code, Cursor & Copilot${c.reset}`)
console.log()

// ─── List ─────────────────────────────────────────────────────────────────────
if (LIST) {
  const skills = listSkills(path.join(REPO_ROOT, 'skills'))
  const agents = listSkills(path.join(REPO_ROOT, 'agents'))
  const hooks  = listFiles(path.join(REPO_ROOT, 'hooks'), '.sh')

  console.log(`${c.bold}Skills (${skills.length})${c.reset}`)
  skills.forEach(s => dim(`/${s.name}`))

  console.log(`\n${c.bold}Agents (${agents.length})${c.reset}`)
  agents.forEach(s => dim(`/${s.name}`))

  console.log(`\n${c.bold}Hooks (${hooks.length})${c.reset}`)
  hooks.forEach(f => dim(path.basename(f)))
  console.log()
  process.exit(0)
}

// ─── Uninstall ───────────────────────────────────────────────────────────────
if (UNINSTALL) {
  step('Uninstalling...')

  const toRemove = [
    ...listSkills(path.join(REPO_ROOT, 'skills')),
    ...listSkills(path.join(REPO_ROOT, 'agents')),
  ].map(s => ({
    dst: s.isDir
      ? path.join(SKILLS_DST, s.name)
      : path.join(SKILLS_DST, s.name + '.md'),
    isDir: s.isDir,
  }))

  const hooksToRemove = listFiles(path.join(REPO_ROOT, 'hooks'), '.sh')
    .map(f => ({ dst: path.join(HOOKS_DST, path.basename(f)), isDir: false }))

  let removed = 0
  for (const item of [...toRemove, ...hooksToRemove]) {
    if (!fs.existsSync(item.dst)) continue
    if (item.isDir) {
      fs.rmSync(item.dst, { recursive: true, force: true })
    } else {
      fs.unlinkSync(item.dst)
    }
    removed++
  }

  ok(`Removed ${removed} items`)
  warn(`settings.json was NOT modified — edit manually if needed: ${SETTINGS}`)
  console.log()
  process.exit(0)
}

// ─── Install ─────────────────────────────────────────────────────────────────

// Check Claude Code
const claudeInstalled = spawnSync('claude', ['--version'], { shell: true }).status === 0
if (!claudeInstalled) {
  warn('Claude Code not found in PATH. Install it with:')
  dim('npm install -g @anthropic-ai/claude-code')
}

let installedCount = 0

// Skills + Agents
if (!HOOKS_ONLY) {
  step('Installing skills...')
  fs.mkdirSync(SKILLS_DST, { recursive: true })

  const skillEntries = [
    ...listSkills(path.join(REPO_ROOT, 'skills')).map(s => ({ ...s, type: 'skill' })),
    ...listSkills(path.join(REPO_ROOT, 'agents')).map(s => ({ ...s, type: 'agent' })),
  ]

  for (const entry of skillEntries) {
    const dst = entry.isDir
      ? path.join(SKILLS_DST, entry.name)
      : path.join(SKILLS_DST, entry.name + '.md')

    if (fs.existsSync(dst) && !YES) {
      const overwrite = await ask(`/${entry.name} already exists. Overwrite?`)
      if (!overwrite) { info(`Skipped: ${entry.name}`); continue }
    }

    if (entry.isDir) {
      copyDir(entry.src, dst)
    } else {
      copyFile(entry.src, dst)
    }

    ok(`${entry.type}: /${entry.name}`)
    installedCount++
  }
}

// Hooks
if (!SKILLS_ONLY) {
  step('Installing hooks...')
  fs.mkdirSync(HOOKS_DST, { recursive: true })

  const hookFiles = listFiles(path.join(REPO_ROOT, 'hooks'), '.sh')

  for (const src of hookFiles) {
    const dst = path.join(HOOKS_DST, path.basename(src))
    copyFile(src, dst)

    // Make executable on Unix
    try { fs.chmodSync(dst, 0o755) } catch {}

    ok(`hook: ${path.basename(src)}`)
    installedCount++
  }

  // settings.json
  step('Configuring settings.json...')

  if (!fs.existsSync(SETTINGS)) {
    // Create from template, replacing paths
    const template = fs.readFileSync(
      path.join(REPO_ROOT, 'hooks', 'settings.template.json'), 'utf8'
    )
    // Use forward slashes in JSON (valid on all platforms including Windows)
    const hooksDstJson = HOOKS_DST.replace(/\\/g, '/')
    const configured = template.replace(/~\/\.claude\/hooks/g, hooksDstJson)

    // Strip comment keys and write valid JSON
    try {
      const cleaned = configured
        .replace(/\s*"_comment":[^\n]+,?\n/g, '\n')
        .replace(/\s*"_note":[^\n]+,?\n/g, '\n')
        .replace(/\s*"_docs":[^\n]+,?\n/g, '\n')
        .replace(/,(\s*[}\]])/g, '$1')
      const parsed = JSON.parse(cleaned)
      fs.writeFileSync(SETTINGS, JSON.stringify(parsed, null, 2))
    } catch {
      fs.writeFileSync(SETTINGS, configured)
    }
    ok(`settings.json created: ${SETTINGS}`)
  } else {
    // Merge hooks into existing settings
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
          const exists = existing.hooks[event].some(x => x.matcher === m.matcher)
          if (!exists) existing.hooks[event].push(m)
        }
      }

      fs.writeFileSync(SETTINGS, JSON.stringify(existing, null, 2))
      ok(`Hooks merged into existing settings.json`)
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

if (!HOOKS_ONLY) {
  console.log(`  ${c.dim}Skills available:${c.reset}  /commit /pr /review /plan /debug /vibe-audit /memory`)
  console.log(`  ${c.dim}Agents available:${c.reset}  /frontend /api /test /refactor /docs`)
}
if (!SKILLS_ONLY) {
  console.log(`  ${c.dim}Hooks active:${c.reset}     pre-bash-safety · pre-commit-secrets · post-format · lint · notify`)
}

console.log()
console.log(`  Restart Claude Code to apply changes.`)
console.log()
