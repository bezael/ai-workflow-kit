/**
 * llm-judge.js
 * Evaluates LLM output against a rubric using Claude as judge.
 *
 * Usage:
 *   import { judge } from './llm-judge.js'
 *   const result = await judge({ output: '...', rubric: [...] })
 *   // result: { passed: boolean, score: number, details: { criterion: string, passed: boolean, note: string }[] }
 */

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

/**
 * @typedef {{ criterion: string, weight?: number }} RubricItem
 * @typedef {{ criterion: string, passed: boolean, note: string }} EvalDetail
 * @typedef {{ passed: boolean, score: number, details: EvalDetail[] }} JudgeResult
 */

// The response shape is enforced by the API (structured outputs), so the
// prompt describes the task and the schema describes the format.
const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          criterion: { type: 'string' },
          passed: { type: 'boolean' },
          note: { type: 'string' },
        },
        required: ['criterion', 'passed', 'note'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
}

/**
 * Evaluate an LLM output against a list of criteria.
 *
 * @param {{ output: string, rubric: RubricItem[], context?: string, threshold?: number }} params
 * @returns {Promise<JudgeResult>}
 */
export async function judge({ output, rubric, context = '', threshold = 0.8 }) {
  const criteriaList = rubric
    .map((r, i) => `${i + 1}. ${r.criterion}`)
    .join('\n')

  const prompt = `You are an impartial evaluator. Assess whether the following output satisfies each criterion, one result per criterion, in order, with a brief note explaining each verdict.

${context ? `## Context\n${context}\n\n` : ''}## Output to evaluate
\`\`\`
${output}
\`\`\`

## Criteria
${criteriaList}
`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema: VERDICT_SCHEMA } },
  })

  if (message.stop_reason !== 'end_turn') {
    throw new Error(`llm-judge: judge stopped with ${message.stop_reason}`)
  }

  const text = message.content.find(b => b.type === 'text')?.text ?? '{}'
  const parsed = JSON.parse(text)

  const details = parsed.results.map((r, i) => ({
    criterion: r.criterion || rubric[i]?.criterion || `criterion ${i + 1}`,
    passed: r.passed,
    note: r.note,
  }))

  const passedCount = details.filter(d => d.passed).length
  const score = details.length > 0 ? passedCount / details.length : 0
  const passed = score >= threshold

  return { passed, score, details, threshold }
}
