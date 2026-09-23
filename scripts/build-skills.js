#!/usr/bin/env node
/**
 * AI Workflow Kit — skill builder
 *
 * Renders one source skill (src/skills/<id>.md) into every distribution:
 *
 *   skills/ak-<id>/SKILL.md         Claude Code
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
import { REPO_ROOT, SRC_DIR, loadSkill, listSkillIds, resolveAcceptance, statusOf } from './lib/spec.js'

const CHECK = process.argv.includes('--check')

const ALLOWLIST      = path.join(REPO_ROOT, 'src', 'eval-coverage.json')
const ALLOWLIST_REL  = 'src/eval-coverage.json'

const MANIFEST       = path.join(REPO_ROOT, 'src', 'manifest.json')
const MANIFEST_REL   = 'src/manifest.json'

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
    out: (id) => path.join(REPO_ROOT, 'skills', `ak-${id}`, 'SKILL.md'),
    invoke: (spec) => `/ak-${spec.name}`,
    args: '$ARGUMENTS',
    severity: { critical: '🔴 Critical', important: '🟡 Important', suggestion: '🔵 Suggestion', improvement: '🔵 Improvements', good: '✅ What\'s good' },
    frontmatter: (spec) => ({
      name: `ak-${spec.name}`,
      description: spec.description,
      ...(spec['argument-hint'] ? { 'argument-hint': spec['argument-hint'] } : {}),
      // Derived from `invocation`. Claude Code is the only target with a flag
      // for this: Antigravity has none, and Codex prompts are flat slash
      // commands the human types, so they are user-invoked by construction.
      ...(spec.invocation === 'user' ? { 'disable-model-invocation': true } : {}),
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

function renderBody(body, spec, target, catalogue) {
  let out = body

  out = out.replaceAll('{{invoke}}', target.invoke(spec))
  out = out.replaceAll('{{catalogue}}', catalogue ?? '')

  // Argument placeholder. Claude Code and Codex substitute $ARGUMENTS;
  // Antigravity has none, so the block is dropped and prose stands in.
  // What the prose should say depends on the skill — a file path for `review`,
  // a description of the problem for `debug` — hence `args_fallback`.
  out = out.replaceAll('{{args}}', target.args ?? spec.args_fallback ?? 'the request the user typed')
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

  // Lifecycle banner, hung under the H1 so it is the first line of prose.
  const banner = statusBanner(spec, target)
  if (banner) {
    const lines = out.split('\n')
    const h1    = lines.findIndex(l => l.startsWith('# '))
    if (h1 === -1)
      throw new Error(`${spec.id} → ${targetName(target)}: body has no H1 to hang the ${statusOf(spec)} banner under`)
    lines.splice(h1 + 1, 0, '', banner)
    out = lines.join('\n')
  }

  // Collapse the blank lines an empty placeholder leaves behind.
  return out.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').trimEnd() + '\n'
}

function targetName(target) {
  return Object.keys(TARGETS).find(k => TARGETS[k] === target)
}

/**
 * The lifecycle banner, rendered in the target's own invocation style.
 *
 * A stable skill gets nothing. Anything else says so in the first thing the
 * reader — human or model — sees, because a skill that is quietly unfinished
 * or quietly retired is worse than one that isn't shipped at all.
 */
function statusBanner(spec, target) {
  switch (statusOf(spec)) {
    case 'experimental':
      return '> **Experimental.** Still being shaped — the steps and the output format can change between releases.'
    case 'deprecated':
      return `> **Deprecated.** Use ${target.invoke({ name: spec.replaced_by })} instead. This still runs, but it will be removed in a future release.`
    default:
      return null
  }
}

function render(spec, body, target, catalogue) {
  const fm = renderFrontmatter(target.frontmatter(spec))
  return `${fm}\n\n${renderBody(body, spec, target, catalogue)}`
}

/**
 * The whole skill set as a markdown table, in one target's invocation style.
 *
 * `{{catalogue}}` lets the router skill list its siblings without anyone
 * maintaining that list by hand — a router that goes stale is worse than no
 * router, because it answers confidently with the wrong set.
 */
function renderCatalogue(specs, target) {
  const rows = specs
    .filter(s => statusOf(s) !== 'deprecated')
    .map(s => {
      const tag = statusOf(s) === 'experimental' ? ' *(experimental)*' : ''
      return `| ${target.invoke(s)}${tag} | ${s.invocation} | ${s.description.trim().replace(/\s+/g, ' ')} |`
    })
  return ['| Command | Invocation | What it does |', '|---|---|---|', ...rows].join('\n')
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

  // Load everything before rendering anything: `{{catalogue}}` needs the whole
  // set, and a skill that lists its siblings can't be built halfway through
  // discovering them.
  const loaded = sources.map(id => loadSkill(id, { knownTargets: Object.keys(TARGETS) }))
  const catalogues = Object.fromEntries(
    Object.entries(TARGETS).map(([name, t]) => [name, renderCatalogue(loaded.map(l => l.spec), t)]),
  )

  let written = 0
  const drifted = []
  const coverage = { covered: [], pending: [] }
  const manifest = []

  for (const { spec, body } of loaded) {
    manifest.push({
      id: spec.id,
      name: spec.name,
      status: statusOf(spec),
      invocation: spec.invocation,
      description: spec.description.trim(),
      ...(spec.replaced_by ? { replaced_by: spec.replaced_by } : {}),
    })

    for (const name of Object.keys(spec.targets)) {
      const target = TARGETS[name]
      const dst    = target.out(spec.id)
      const next   = render(spec, body, target, catalogues[name])
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

  // The manifest is what `bin/cli.js` reads to label a skill in its listing.
  // The CLI ships with no dependencies and cannot parse YAML, so the build
  // hands it JSON rather than making it re-derive the specs.
  const manifestJson = JSON.stringify(
    { generated: 'by scripts/build-skills.js — run `npm run build`, do not edit', skills: manifest },
    null, 2,
  ) + '\n'
  const manifestPrev = fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, 'utf8') : null

  if (CHECK) {
    if (manifestPrev !== manifestJson) drifted.push(MANIFEST_REL)
  } else if (manifestPrev !== manifestJson) {
    fs.writeFileSync(MANIFEST, manifestJson)
    console.log(`  ${manifestPrev === null ? 'created' : 'updated'}  ${MANIFEST_REL}`)
    written++
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
