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

/**
 * Evaluate an LLM output against a list of criteria.
 *
 * @param {{ output: string, rubric: RubricItem[], context?: string }} params
 * @returns {Promise<JudgeResult>}
 */
export async function judge({ output, rubric, context = '' }) {
  const criteriaList = rubric
    .map((r, i) => `${i + 1}. ${r.criterion}`)
    .join('\n')

  const prompt = `You are an impartial evaluator. Assess whether the following output satisfies each criterion.

${context ? `## Context\n${context}\n\n` : ''}## Output to evaluate
\`\`\`
${output}
\`\`\`

## Criteria
${criteriaList}

## Instructions
For each criterion, respond with exactly this JSON format (no extra text):
{
  "results": [
    { "criterion": "...", "passed": true/false, "note": "brief explanation" },
    ...
  ]
}
`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  let parsed
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch?.[0] ?? '{}')
  } catch {
    throw new Error(`llm-judge: failed to parse response: ${text}`)
  }

  const details = (parsed.results ?? []).map((r, i) => ({
    criterion: r.criterion ?? rubric[i]?.criterion ?? `criterion ${i + 1}`,
    passed: Boolean(r.passed),
    note: r.note ?? '',
  }))

  const passedCount = details.filter(d => d.passed).length
  const score = details.length > 0 ? passedCount / details.length : 0
  const passed = score >= 0.8

  return { passed, score, details }
}
