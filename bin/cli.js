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
function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.copyFileSync(src, dst)
}

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => f.endsWith(ext)).map(f => path.join(dir, f))
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
  const skills = listFiles(path.join(REPO_ROOT, 'skills'), '.md')
  const agents = listFiles(path.join(REPO_ROOT, 'agents'), '.md')
  const hooks  = listFiles(path.join(REPO_ROOT, 'hooks'), '.sh')

  console.log(`${c.bold}Skills (${skills.length})${c.reset}`)
  skills.forEach(f => dim(`/` + path.basename(f, '.md')))

  console.log(`\n${c.bold}Agents (${agents.length})${c.reset}`)
  agents.forEach(f => dim(`/` + path.basename(f, '.md')))

  console.log(`\n${c.bold}Hooks (${hooks.length})${c.reset}`)
  hooks.forEach(f => dim(path.basename(f)))
  console.log()
  process.exit(0)
}

// ─── Uninstall ───────────────────────────────────────────────────────────────
if (UNINSTALL) {
  step('Uninstalling...')
  const toRemove = [
    ...listFiles(path.join(REPO_ROOT, 'skills'), '.md'),
    ...listFiles(path.join(REPO_ROOT, 'agents'), '.md'),
  ].map(f => path.join(SKILLS_DST, path.basename(f)))

  const hooksToRemove = listFiles(path.join(REPO_ROOT, 'hooks'), '.sh')
    .map(f => path.join(HOOKS_DST, path.basename(f)))

  let removed = 0
  for (const f of [...toRemove, ...hooksToRemove]) {
    if (fs.existsSync(f)) { fs.unlinkSync(f); removed++ }
  }

  ok(`Removed ${removed} files`)
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

  const skillFiles = [
    ...listFiles(path.join(REPO_ROOT, 'skills'), '.md'),
    ...listFiles(path.join(REPO_ROOT, 'agents'), '.md'),
  ]

  for (const src of skillFiles) {
    const name = path.basename(src)
    const dst  = path.join(SKILLS_DST, name)
    const type = src.includes('/agents/') ? 'agent' : 'skill'

    if (fs.existsSync(dst) && !YES) {
      const overwrite = await ask(`/${path.basename(src, '.md')} already exists. Overwrite?`)
      if (!overwrite) { info(`Skipped: ${name}`); continue }
    }

    copyFile(src, dst)
    ok(`${type}: /${path.basename(src, '.md')}`)
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
console.log(`${c.bold}${c.green}  Installation complete${c.reset}  (${installedCount} files)`)
console.log(`${c.bold}  ─────────────────────────────${c.reset}`)
console.log()

if (!HOOKS_ONLY) {
  console.log(`  ${c.dim}Skills available:${c.reset}  /commit /pr /review /plan /debug /vibe-audit`)
  console.log(`  ${c.dim}Agents available:${c.reset}  /frontend /api /test /refactor /docs`)
}
if (!SKILLS_ONLY) {
  console.log(`  ${c.dim}Hooks active:${c.reset}     pre-bash-safety · pre-commit-secrets · post-format · lint · notify`)
}

console.log()
console.log(`  Restart Claude Code to apply changes.`)
console.log()
