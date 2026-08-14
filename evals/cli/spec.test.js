/**
 * Tests for the skill spec schema — specifically the `invocation` axis.
 *
 * `invocation` decides who can reach a skill, and that decides who the
 * `description` is written for. The rule is easy to state and easy to let rot,
 * so the schema enforces it rather than a convention doc asking nicely.
 *
 * Cases run against a minimal valid spec with one field bent at a time, so a
 * failure names the rule that broke.
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { validateSpec, listSkillIds, loadSkill, statusOf, STATUSES, REPO_ROOT } from '../../scripts/lib/spec.js'

const BASE = {
  id: 'demo',
  name: 'demo',
  description: 'Does the demo thing.',
  invocation: 'user',
  contract: ['Does the thing'],
  acceptance: { threshold: 0.8, pending: 'no fixture yet', criteria: ['Does the thing'] },
  targets: { claude: {} },
}

const spec = (overrides) => ({ ...BASE, ...overrides })

describe('invocation', () => {
  it('accepts a user-invoked skill with a human-facing description', () => {
    expect(() => validateSpec(spec(), 'demo.md')).not.toThrow()
  })

  it('accepts a model-invoked skill with trigger phrasing', () => {
    expect(() => validateSpec(spec({
      invocation: 'model',
      description: 'Does the demo thing. Use when the user says /demo.',
    }), 'demo.md')).not.toThrow()
  })

  it('requires the field', () => {
    const { invocation, ...without } = BASE
    expect(() => validateSpec(without, 'demo.md')).toThrow(/missing `invocation`/)
  })

  it('rejects a value outside user | model', () => {
    expect(() => validateSpec(spec({ invocation: 'auto' }), 'demo.md'))
      .toThrow(/`invocation` must be one of/)
  })

  it('rejects trigger phrasing on a user-invoked skill', () => {
    // Nothing but the human can fire it, so the triggers are dead weight in a
    // list a person reads.
    expect(() => validateSpec(spec({
      description: 'Does the demo thing. Use when the user says /demo.',
    }), 'demo.md')).toThrow(/model-facing trigger phrasing/)
  })

  it('rejects a model-invoked skill with no trigger phrasing', () => {
    // Without triggers the harness has nothing to match on, so it never fires.
    expect(() => validateSpec(spec({ invocation: 'model' }), 'demo.md'))
      .toThrow(/no trigger phrasing/)
  })

  it('rejects a hand-written disable-model-invocation', () => {
    // It is derived from `invocation`; a second copy is how the two drift.
    expect(() => validateSpec(spec({
      targets: { claude: { frontmatter: { 'disable-model-invocation': true } } },
    }), 'demo.md')).toThrow(/derived from `invocation`/)
  })
})

describe('status', () => {
  it('defaults to stable when omitted', () => {
    expect(statusOf(BASE)).toBe('stable')
    expect(() => validateSpec(spec(), 'demo.md')).not.toThrow()
  })

  it('accepts experimental with no extra fields', () => {
    expect(() => validateSpec(spec({ status: 'experimental' }), 'demo.md')).not.toThrow()
  })

  it('rejects an unknown status', () => {
    expect(() => validateSpec(spec({ status: 'beta' }), 'demo.md'))
      .toThrow(/`status` must be one of/)
  })

  it('rejects a deprecation with nowhere to go', () => {
    expect(() => validateSpec(spec({ status: 'deprecated' }), 'demo.md'))
      .toThrow(/needs `replaced_by/)
  })

  it('accepts a deprecation that names its replacement', () => {
    expect(() => validateSpec(spec({ status: 'deprecated', replaced_by: 'plan' }), 'demo.md'))
      .not.toThrow()
  })

  it('rejects replaced_by on a skill that is not deprecated', () => {
    expect(() => validateSpec(spec({ replaced_by: 'plan' }), 'demo.md'))
      .toThrow(/only applies to `status: deprecated`/)
  })
})

describe('the real skill sources', () => {
  it('every skill declares an invocation that satisfies the schema', () => {
    const ids = listSkillIds()
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      const { spec } = loadSkill(id)
      expect(['user', 'model']).toContain(spec.invocation)
    }
  })

  it('the generated manifest covers every source, with a valid status', () => {
    // The CLI reads this file instead of parsing frontmatter, so a source the
    // manifest has never heard of is a skill the installer cannot label.
    const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src', 'manifest.json'), 'utf8'))
    const byId = new Map(manifest.skills.map(s => [s.id, s]))

    expect([...byId.keys()].sort()).toEqual(listSkillIds())
    for (const entry of manifest.skills) {
      expect(STATUSES).toContain(entry.status)
      if (entry.status === 'deprecated') expect(entry.replaced_by).toBeTruthy()
    }
  })
})
