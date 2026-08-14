#!/usr/bin/env node
/**
 * AI Workflow Kit — docs sync
 *
 * The install commands used to be written out by hand in `README.md`,
 * `README.es.md` and `CLAUDE.md`. Three copies of the same thing drift: the
 * English README pinned a version that shipped months ago, and the Spanish one
 * was missing two flags the CLI has accepted since.
 *
 * So there is one copy. `src/install-block.md` holds the canonical blocks, and
 * this script injects them into the marked regions of each consumer:
 *
 *   <!-- ak:block quickstart.en -->
 *   ...generated, do not edit...
 *   <!-- /ak:block -->
 *
 * It also lints what it cannot generate:
 *
 *   · every `npx ai-workflow-kit --flag` in the docs is a flag `bin/cli.js`
 *     actually accepts — no phantom options
 *   · the flag set is the same in every language — no flag documented in one
 *     README and forgotten in the other
 *
 * Usage:
 *   node scripts/sync-docs.js           # write the blocks
 *   node scripts/sync-docs.js --check   # verify, exit 1 on drift
 */

import fs from 'fs'
import path from 'path'
import { REPO_ROOT } from './lib/spec.js'

const CHECK = process.argv.includes('--check')

const SOURCE = path.join(REPO_ROOT, 'src', 'install-block.md')
const CLI    = path.join(REPO_ROOT, 'bin', 'cli.js')

/** Files scanned for `npx ai-workflow-kit --flag` mentions. */
const LINTED = ['README.md', 'README.es.md', 'CLAUDE.md', 'docs/authoring-skills.md']

// ─── Canonical blocks ────────────────────────────────────────────────────────

/** `<!-- block: name -->…<!-- endblock -->` pairs out of the canonical file. */
function readBlocks() {
  const raw = fs.readFileSync(SOURCE, 'utf8')
  const blocks = new Map()
  const re = /<!--\s*block:\s*([\w.-]+)\s*-->\n([\s\S]*?)\n<!--\s*endblock\s*-->/g
  for (const m of raw.matchAll(re)) blocks.set(m[1], m[2])
  if (blocks.size === 0) throw new Error(`${SOURCE}: no blocks found`)
  return blocks
}

/**
 * The user-facing command list, from the generated skill manifest plus the
 * agents on disk — so adding a skill cannot leave the README behind.
 */
function commandList() {
  const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src', 'manifest.json'), 'utf8'))
  const skills = manifest.skills
    .filter(s => s.status !== 'deprecated')
    .map(s => s.name)
  const agentsDir = path.join(REPO_ROOT, 'agents')
  const agents = fs.existsSync(agentsDir)
    ? fs.readdirSync(agentsDir).filter(e => fs.statSync(path.join(agentsDir, e)).isDirectory())
    : []
  return [...skills, ...agents].sort().map(n => `\`/ak:${n}\``).join(', ')
}

function hookCount() {
  const dir = path.join(REPO_ROOT, 'hooks')
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.sh')).length : 0
}

function resolve(block, vars) {
  const out = block.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m))
  const left = [...out.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1])
  if (left.length) throw new Error(`unresolved placeholder(s): ${[...new Set(left)].join(', ')}`)
  return out
}

// ─── Injection ───────────────────────────────────────────────────────────────

const marker = (name) => ({
  open: `<!-- ak:block ${name} -->`,
  close: '<!-- /ak:block -->',
})

/** Replace every marked region in `text`; returns the new text. */
function inject(text, blocks, vars, file) {
  return text.replace(
    /<!-- ak:block ([\w.-]+) -->[\s\S]*?<!-- \/ak:block -->/g,
    (_, name) => {
      if (!blocks.has(name)) throw new Error(`${file}: no canonical block named "${name}" in src/install-block.md`)
      const { open, close } = marker(name)
      return `${open}\n${resolve(blocks.get(name), vars)}\n${close}`
    },
  )
}

// ─── Lint ────────────────────────────────────────────────────────────────────

/** Long-form flags `bin/cli.js` tests for. */
function cliFlags() {
  const src = fs.readFileSync(CLI, 'utf8')
  return new Set([...src.matchAll(/args\.includes\('(--[\w-]+)'\)/g)].map(m => m[1]))
}

function lint(blocks) {
  const failures = []
  const known = cliFlags()

  for (const rel of LINTED) {
    const file = path.join(REPO_ROOT, rel)
    if (!fs.existsSync(file)) continue
    const text = fs.readFileSync(file, 'utf8')
    for (const m of text.matchAll(/npx ai-workflow-kit ((?:--[\w-]+\s*)+)/g)) {
      for (const flag of m[1].trim().split(/\s+/)) {
        if (!known.has(flag)) failures.push(`${rel}: documents \`${flag}\`, which bin/cli.js does not accept`)
      }
    }
  }

  // A doc marked `<!-- ak:skill-table -->` claims to list the whole set, so
  // every shipped skill has to appear in it.
  //
  // The tables can't be generated — their prose column is translated per
  // language — but they can be checked. Both READMEs had been sitting on a
  // list that predated /ak:handoff and /ak:memory.
  const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src', 'manifest.json'), 'utf8'))
  const shipped = manifest.skills.filter(s => s.status !== 'deprecated').map(s => s.name)
  for (const rel of LINTED) {
    const file = path.join(REPO_ROOT, rel)
    if (!fs.existsSync(file)) continue
    const text = fs.readFileSync(file, 'utf8')
    // On its own line — a doc that merely *mentions* the marker in prose (this
    // script's own documentation does) is not claiming to be a catalogue.
    if (!/^<!-- ak:skill-table -->\s*$/m.test(text)) continue
    for (const name of shipped) {
      if (!text.includes(`/ak:${name}`)) failures.push(`${rel}: claims to list every skill but never mentions \`/ak:${name}\``)
    }
  }

  // Every skill has a docs page, and the index links it.
  //
  // The pages can't be generated — they're the part that explains *why* you'd
  // reach for a skill — but a skill shipped without one is invisible to anyone
  // who isn't already reading the specs.
  const indexPath = path.join(REPO_ROOT, 'docs', 'skills', 'README.md')
  const index = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : ''
  for (const name of shipped) {
    const page = path.join(REPO_ROOT, 'docs', 'skills', `${name}.md`)
    if (!fs.existsSync(page)) failures.push(`docs/skills/${name}.md is missing — every skill needs a page`)
    else if (!index.includes(`(${name}.md)`)) failures.push(`docs/skills/README.md does not link ${name}.md`)
  }

  // Same flags in every language of a block.
  const byBase = new Map()
  for (const [name, body] of blocks) {
    const [base, lang] = name.split('.')
    const flags = new Set([...body.matchAll(/npx ai-workflow-kit (--[\w-]+)/g)].map(m => m[1]))
    if (!byBase.has(base)) byBase.set(base, [])
    byBase.get(base).push({ lang, flags })
  }
  for (const [base, variants] of byBase) {
    if (variants.length < 2) continue
    const [first, ...rest] = variants
    for (const other of rest) {
      for (const f of first.flags) if (!other.flags.has(f))
        failures.push(`block ${base}.${other.lang} is missing \`${f}\`, which ${base}.${first.lang} documents`)
      for (const f of other.flags) if (!first.flags.has(f))
        failures.push(`block ${base}.${first.lang} is missing \`${f}\`, which ${base}.${other.lang} documents`)
    }
  }

  return failures
}

// ─── Run ─────────────────────────────────────────────────────────────────────

function run() {
  const blocks = readBlocks()
  const vars = {
    version: JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version,
    commands: commandList(),
    hooks: String(hookCount()),
  }

  const failures = lint(blocks)
  const drifted = []
  let written = 0

  const consumers = fs.readdirSync(REPO_ROOT)
    .filter(f => f.endsWith('.md'))
    .concat(fs.existsSync(path.join(REPO_ROOT, 'docs'))
      ? fs.readdirSync(path.join(REPO_ROOT, 'docs')).filter(f => f.endsWith('.md')).map(f => path.join('docs', f))
      : [])

  for (const rel of consumers) {
    const file = path.join(REPO_ROOT, rel)
    const prev = fs.readFileSync(file, 'utf8')
    if (!prev.includes('<!-- ak:block ')) continue
    const next = inject(prev, blocks, vars, rel)
    if (prev === next) continue

    if (CHECK) drifted.push(rel.replaceAll('\\', '/'))
    else {
      fs.writeFileSync(file, next)
      console.log(`  updated  ${rel.replaceAll('\\', '/')}`)
      written++
    }
  }

  if (failures.length) {
    console.error('\n✗ Install docs lint failed:\n')
    failures.forEach(f => console.error(`    ${f}`))
    console.error('')
    process.exit(1)
  }

  if (CHECK) {
    if (drifted.length) {
      console.error(`\n✗ ${drifted.length} file(s) out of sync with src/install-block.md:\n`)
      drifted.forEach(f => console.error(`    ${f}`))
      console.error('\n  These regions are generated. Edit src/install-block.md, then run:')
      console.error('    npm run build\n')
      process.exit(1)
    }
    console.log('✓ Install block in sync across all docs')
    return
  }

  console.log(written === 0 ? '✓ Install block already up to date' : `✓ Install block synced — ${written} file(s) written`)
}

run()
