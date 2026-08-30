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

const REQUIRED = ['id', 'name', 'description', 'invocation', 'contract', 'acceptance', 'targets']

const INVOCATIONS = ['user', 'model']

/**
 * Model-facing trigger phrasing.
 *
 * `invocation` decides who the `description` is written for. A model-invoked
 * skill needs these phrases so the harness fires it on its own; a user-invoked
 * skill must not carry them, because nothing but the human typing its name can
 * ever reach it — the triggers are dead weight in a list a person reads.
 */
const TRIGGER_PHRASING = /\buse (?:this )?when\b|\bwhen (?:the )?user\b|\btriggers? on\b/i

/**
 * Lifecycle. Optional — a spec with no `status` is `stable`.
 *
 * The point is to be able to ship a skill that isn't finished, and to retire
 * one without breaking the people using it, in both cases *visibly*. A skill
 * that is neither stable nor honest about it is the thing this prevents.
 */
export const STATUSES = ['stable', 'experimental', 'deprecated']
export const DEFAULT_STATUS = 'stable'

export const statusOf = (spec) => spec.status ?? DEFAULT_STATUS

export function parseSource(raw, label = 'source') {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!m) throw new Error(`${label}: missing YAML frontmatter`)
  return { spec: parseYaml(m[1]), body: m[2] }
}

export function validateSpec(spec, label, knownTargets) {
  const errors = []
  for (const k of REQUIRED) if (!spec[k]) errors.push(`missing \`${k}\``)

  if (spec.invocation && !INVOCATIONS.includes(spec.invocation)) {
    errors.push(`\`invocation\` must be one of: ${INVOCATIONS.join(', ')}`)
  } else if (spec.invocation && spec.description) {
    const hasTriggers = TRIGGER_PHRASING.test(spec.description)
    if (spec.invocation === 'user' && hasTriggers)
      errors.push(
        '`invocation: user` but the description carries model-facing trigger phrasing ' +
        '("use when…"). Only the human can reach this skill, so the description is read ' +
        'by a person browsing slash commands — state what it does in one line.'
      )
    if (spec.invocation === 'model' && !hasTriggers)
      errors.push(
        '`invocation: model` but the description has no trigger phrasing. Add ' +
        '"Use when the user says…, mentions…, asks for…" so the harness can fire it.'
      )
  }

  // `disable-model-invocation` is derived from `invocation`, so the two can
  // never disagree — a hand-written copy is how they drift apart.
  if (spec.targets?.claude?.frontmatter?.['disable-model-invocation'] !== undefined)
    errors.push('remove `disable-model-invocation` from `targets.claude.frontmatter` — it is derived from `invocation`')

  if (spec.status !== undefined && !STATUSES.includes(spec.status)) {
    errors.push(`\`status\` must be one of: ${STATUSES.join(', ')} (omit it for ${DEFAULT_STATUS})`)
  } else if (spec.status === 'deprecated' && !spec.replaced_by) {
    // A deprecation with nowhere to go is an unanswered question for whoever
    // reads the banner.
    errors.push('`status: deprecated` needs `replaced_by: <skill id>` — say where users should go instead')
  } else if (spec.replaced_by && spec.status !== 'deprecated') {
    errors.push('`replaced_by` only applies to `status: deprecated`')
  }

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
 *
 * A case may carry its own `criteria`, replacing the shared list for that case
 * alone — for skills whose cases exercise different layers (a fixture-specific
 * rubric can't hold across heterogeneous fixtures).
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
        criteria: (c.criteria ?? a.criteria).map(cr => interpolate(cr, vars)),
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
