#!/usr/bin/env node
/**
 * AI Workflow Kit — skill builder
 *
 * Renders one source skill (src/skills/<id>.md) into every distribution:
 *
 *   skills/<id>/SKILL.md            Claude Code
 *   antigravity-skills/<id>/SKILL.md  Google Antigravity
 *   codex-prompts/ak-<id>.md        OpenAI Codex
 *
 * The generated files are committed, because the installers read them
 * directly. `--check` re-renders and fails if anything drifted — that's the
 * CI gate against hand-editing a generated file.
 *
 * Usage:
 *   node scripts/build-skills.js           # write the distributions
 *   node scripts/build-skills.js --check   # verify they match the source
 */

import fs from 'fs'
import path from 'path'
import { REPO_ROOT, SRC_DIR, loadSkill, listSkillIds, resolveAcceptance } from './lib/spec.js'

const CHECK = process.argv.includes('--check')

const ALLOWLIST      = path.join(REPO_ROOT, 'src', 'eval-coverage.json')
const ALLOWLIST_REL  = 'src/eval-coverage.json'

function readAllowlist() {
  if (!fs.existsSync(ALLOWLIST)) return []
  try {
    return JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8')).pending ?? []
  } catch (e) {
    console.error(`✗ ${ALLOWLIST_REL} is not valid JSON: ${e.message}`)
    process.exit(1)
  }
}

// ─── Targets ─────────────────────────────────────────────────────────────────

const TARGETS = {
  claude: {
    out: (id) => path.join(REPO_ROOT, 'skills', id, 'SKILL.md'),
    invoke: (spec) => `/ak:${spec.name}`,
    args: '$ARGUMENTS',
    severity: { critical: '🔴 Critical', important: '🟡 Important', suggestion: '🔵 Suggestion', improvement: '🔵 Improvements', good: '✅ What\'s good' },
    frontmatter: (spec) => ({
      name: `ak:${spec.name}`,
      description: spec.description,
      ...(spec['argument-hint'] ? { 'argument-hint': spec['argument-hint'] } : {}),
      ...(spec.targets?.claude?.frontmatter ?? {}),
    }),
    // Claude Code executes !`cmd` inline when the skill loads.
    context: (ctx) => [
      '## Context',
      '',
      ...ctx.map(c => `- ${c.label}: !\`${c.command}\``),
    ].join('\n'),
  },

  antigravity: {
    out: (id) => path.join(REPO_ROOT, 'antigravity-skills', id, 'SKILL.md'),
    invoke: (spec) => `@${spec.name}`,
    // Antigravity has no argument placeholder — the user's text is the prompt.
    args: null,
    // Antigravity's renderer drops the severity emoji, so spell them out.
    severity: { critical: 'Critical', important: 'Important', suggestion: 'Suggestion', improvement: 'Improvements', good: 'What\'s good' },
    frontmatter: (spec) => ({ name: spec.name, description: spec.description }),
    // No inline shell execution — describe the commands instead.
    context: (ctx) => [
      '## Context to gather first',
      '',
      'Run these and read the output before starting:',
      '',
      '```bash',
      ...ctx.map(c => `${c.command}   # ${c.label}`),
      '```',
    ].join('\n'),
  },

  codex: {
    out: (id) => path.join(REPO_ROOT, 'codex-prompts', `ak-${id}.md`),
    // Codex prompts are flat files — an asset next to one would register as a
    // phantom slash command. The installers copy assets from the Claude Code
    // distribution into $CODEX_HOME/ak-workflow-kit/ instead.
    assets: false,
    invoke: (spec) => `/ak-${spec.name}`,
    args: '$ARGUMENTS',
    severity: { critical: '🔴 Critical', important: '🟡 Important', suggestion: '🔵 Suggestion', improvement: '🔵 Improvements', good: '✅ What\'s good' },
    // Codex accepts only these two frontmatter keys.
    frontmatter: (spec) => ({
      description: spec.description,
      ...(spec['argument-hint'] ? { 'argument-hint': spec['argument-hint'] } : {}),
    }),
    context: (ctx) => [
      '## Context to gather first',
      '',
      'Run these commands and read their output before starting:',
      '',
      '```bash',
      ...ctx.map(c => `${c.command}   # ${c.label}`),
      '```',
    ].join('\n'),
  },
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderFrontmatter(fields) {
  const lines = Object.entries(fields).map(([k, v]) => {
    const s = String(v)
    // Quote anything YAML would otherwise reinterpret.
    const needsQuote = /^[[\]{}>|*&!%@`]|: |^\s|\s$|#/.test(s)
    return `${k}: ${needsQuote ? JSON.stringify(s) : s}`
  })
  return ['---', ...lines, '---'].join('\n')
}

function renderBody(body, spec, target) {
  let out = body

  out = out.replaceAll('{{invoke}}', target.invoke(spec))

  // Argument placeholder. Claude Code and Codex substitute $ARGUMENTS;
  // Antigravity has none, so the block is dropped and prose stands in.
  out = out.replaceAll('{{args}}', target.args ?? 'the path the user gave')
  out = out.replaceAll('{{args_block}}', target.args ? `## Target\n\n${target.args}` : '')

  for (const [key, label] of Object.entries(target.severity))
    out = out.replaceAll(`{{sev:${key}}}`, label)

  out = out.replaceAll('{{context}}', spec.context?.length ? target.context(spec.context) : '')

  const opts  = spec.targets?.[targetName(target)] ?? {}
  const extra = opts.extra_rules ?? []
  out = out.replaceAll('{{extra_rules}}', extra.map(r => `- ${r}`).join('\n'))

  // Any other scalar under `targets.<name>` becomes a {{placeholder}}, so a
  // skill can vary a phrase per target without the builder knowing about it.
  for (const [key, value] of Object.entries(opts)) {
    if (key === 'frontmatter' || key === 'extra_rules') continue
    out = out.replaceAll(`{{${key}}}`, String(value).trim())
  }

  const unresolved = [...out.matchAll(/\{\{([\w:]+)\}\}/g)].map(m => m[1])
  if (unresolved.length) {
    throw new Error(
      `${spec.id} → ${targetName(target)}: unresolved placeholder(s): ${[...new Set(unresolved)].join(', ')}`
    )
  }

  // Collapse the blank lines an empty placeholder leaves behind.
  return out.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').trimEnd() + '\n'
}

function targetName(target) {
  return Object.keys(TARGETS).find(k => TARGETS[k] === target)
}

function render(spec, body, target) {
  const fm = renderFrontmatter(target.frontmatter(spec))
  return `${fm}\n\n${renderBody(body, spec, target)}`
}

// ─── Build ───────────────────────────────────────────────────────────────────

function build() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`No source directory: ${SRC_DIR}`)
    process.exit(1)
  }

  const sources = listSkillIds()
  if (sources.length === 0) {
    console.error(`No skill sources in ${SRC_DIR}`)
    process.exit(1)
  }

  let written = 0
  const drifted = []
  const coverage = { covered: [], pending: [] }

  for (const id of sources) {
    const { spec, body } = loadSkill(id, { knownTargets: Object.keys(TARGETS) })

    for (const name of Object.keys(spec.targets)) {
      const target = TARGETS[name]
      const dst    = target.out(spec.id)
      const next   = render(spec, body, target)
      const prev   = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null

      // Auxiliary files the skill body references (e.g. vibe-audit's
      // patterns.md). Codex prompts are flat files, so its assets go to a
      // sibling reference directory instead of next to the prompt.
      for (const asset of (target.assets === false ? [] : spec.assets ?? [])) {
        const from = path.join(SRC_DIR, spec.id, asset)
        const to   = target.asset
          ? target.asset(spec.id, asset)
          : path.join(path.dirname(dst), asset)
        const want = fs.readFileSync(from, 'utf8')
        const have = fs.existsSync(to) ? fs.readFileSync(to, 'utf8') : null

        if (CHECK) {
          if (have !== want) drifted.push(path.relative(REPO_ROOT, to).replaceAll('\\', '/'))
        } else if (have !== want) {
          fs.mkdirSync(path.dirname(to), { recursive: true })
          fs.writeFileSync(to, want)
          console.log(`  ${have === null ? 'created' : 'updated'}  ${path.relative(REPO_ROOT, to).replaceAll('\\', '/')}`)
          written++
        }
      }

      if (CHECK) {
        if (prev !== next) drifted.push(path.relative(REPO_ROOT, dst).replaceAll('\\', '/'))
        continue
      }

      if (prev === next) continue
      fs.mkdirSync(path.dirname(dst), { recursive: true })
      fs.writeFileSync(dst, next)
      console.log(`  ${prev === null ? 'created' : 'updated'}  ${path.relative(REPO_ROOT, dst).replaceAll('\\', '/')}`)
      written++
    }

    const acc = resolveAcceptance(spec)
    if (acc.pending) coverage.pending.push(`${spec.id} — ${acc.pending}`)
    else coverage.covered.push(spec.id)
  }

  if (CHECK) {
    if (drifted.length) {
      console.error(`\n✗ ${drifted.length} generated file(s) out of sync with src/skills/:\n`)
      drifted.forEach(f => console.error(`    ${f}`))
      console.error(`\n  These files are generated. Edit the source in src/skills/, then run:`)
      console.error(`    npm run build\n`)
      process.exit(1)
    }
    console.log(`✓ ${sources.length} skill source(s) in sync across all distributions`)
    reportCoverage(coverage, sources.length)
    enforceCoverage(coverage)
    return
  }

  console.log(written === 0
    ? `\n✓ Already up to date (${sources.length} source skill(s))`
    : `\n✓ Built ${sources.length} skill source(s) — ${written} file(s) written`)
  reportCoverage(coverage, sources.length)
}

function reportCoverage({ covered, pending }, total) {
  console.log(`\n  Eval coverage: ${covered.length}/${total} skills have executable acceptance cases`)
  if (pending.length) {
    console.log('  Contract only, no fixture yet:')
    pending.forEach(p => console.log(`    · ${p}`))
  }
}

/**
 * Coverage ratchet. Every skill must declare acceptance criteria — that is
 * enforced by the spec schema. This checks the stronger property: a skill
 * whose criteria are not runnable has to be named in src/eval-coverage.json,
 * so shipping one without an eval is a visible edit rather than an omission.
 *
 * It fails in both directions, which is what keeps the list from rotting into
 * a permanent excuse: writing a fixture forces you to delete the entry.
 */
function enforceCoverage({ covered, pending }) {
  const allowed = new Set(readAllowlist())
  const pendingIds = pending.map(p => p.split(' — ')[0])
  const failures = []

  for (const id of pendingIds) {
    if (!allowed.has(id)) {
      failures.push(`${id} has no executable acceptance cases and is not listed in ${ALLOWLIST_REL}`)
    }
  }
  for (const id of allowed) {
    if (covered.includes(id)) {
      failures.push(`${id} now has acceptance cases — remove it from ${ALLOWLIST_REL}`)
    } else if (!pendingIds.includes(id)) {
      failures.push(`${id} is listed in ${ALLOWLIST_REL} but has no skill source — remove it`)
    }
  }

  if (failures.length) {
    console.error(`\n✗ Eval coverage gate failed:\n`)
    failures.forEach(f => console.error(`    ${f}`))
    console.error(`\n  Give the skill an \`acceptance.cases\` entry pointing at a fixture,`)
    console.error(`  or add it to ${ALLOWLIST_REL} with the reason it can't have one yet.\n`)
    process.exit(1)
  }
}

build()
