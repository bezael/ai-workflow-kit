/**
 * Skill spec loader.
 *
 * A skill source (`src/skills/<id>.md`) is YAML frontmatter — the spec — plus
 * a portable markdown body. Both the distribution builder and the evals read
 * specs through here, so the acceptance criteria have exactly one home.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse as parseYaml } from 'yaml'

const __dir     = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.resolve(__dir, '..', '..')
export const SRC_DIR   = path.join(REPO_ROOT, 'src', 'skills')

const REQUIRED = ['id', 'name', 'description', 'contract', 'acceptance', 'targets']

export function parseSource(raw, label = 'source') {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!m) throw new Error(`${label}: missing YAML frontmatter`)
  return { spec: parseYaml(m[1]), body: m[2] }
}

export function validateSpec(spec, label, knownTargets) {
  const errors = []
  for (const k of REQUIRED) if (!spec[k]) errors.push(`missing \`${k}\``)

  if (spec.acceptance) {
    const a = spec.acceptance
    if (!Array.isArray(a.criteria) || a.criteria.length === 0)
      errors.push('`acceptance.criteria` must be a non-empty list')
    if (typeof a.threshold !== 'number')
      errors.push('`acceptance.threshold` must be a number')

    // `cases` is optional: a skill can declare its criteria before anyone has
    // built a fixture to run them against. It then has a contract but no
    // executable eval, which `npm run build` reports as missing coverage.
    if (a.cases !== undefined) {
      if (!Array.isArray(a.cases) || a.cases.length === 0)
        errors.push('`acceptance.cases` must be a non-empty list when present')
      else a.cases.forEach((c, i) => {
        if (!c.name) errors.push(`\`acceptance.cases[${i}].name\` is required`)
        if (!c.fixture && !c.input)
          errors.push(`\`acceptance.cases[${i}]\` needs a \`fixture\` or an \`input\``)
      })
    } else if (!a.pending) {
      errors.push('`acceptance` needs either `cases` or `pending: <reason>`')
    }
  }
  if (knownTargets) {
    for (const t of Object.keys(spec.targets ?? {}))
      if (!knownTargets.includes(t)) errors.push(`unknown target \`${t}\``)
  }

  if (errors.length) throw new Error(`${label}:\n  - ${errors.join('\n  - ')}`)
  return spec
}

/** Load one skill source by id. */
export function loadSkill(id, { knownTargets } = {}) {
  const file = path.join(SRC_DIR, `${id}.md`)
  if (!fs.existsSync(file)) throw new Error(`No skill source for "${id}" at ${file}`)
  const { spec, body } = parseSource(fs.readFileSync(file, 'utf8'), `${id}.md`)
  validateSpec(spec, `${id}.md`, knownTargets)
  return { spec, body, file }
}

function interpolate(str, vars) {
  return String(str).replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m))
}

/**
 * Turn a spec's `acceptance` block into concrete eval cases, with `{{var}}`
 * placeholders in the criteria resolved per case. Evals call this instead of
 * hand-writing rubrics.
 */
export function resolveAcceptance(spec) {
  const a = spec.acceptance
  if (!a.cases) return { pending: a.pending ?? 'no fixture yet', threshold: a.threshold, cases: [] }

  const baseVars = a.vars ?? {}
  return {
    pending: false,
    threshold: a.threshold,
    cases: a.cases.map(c => {
      const vars = { ...baseVars, ...(c.vars ?? {}) }
      return {
        name: c.name,
        fixture: c.fixture,
        input: c.input ? interpolate(c.input, vars) : undefined,
        context: interpolate(c.context ?? a.context ?? '', vars),
        criteria: a.criteria.map(cr => interpolate(cr, vars)),
      }
    }),
  }
}

/** Ids of every skill that has a source, in stable order. */
export function listSkillIds() {
  if (!fs.existsSync(SRC_DIR)) return []
  return fs.readdirSync(SRC_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.basename(f, '.md'))
    .sort()
}
