import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Hook and CLI tests run fast; LLM evals run separately via run-evals.js
    include: ['evals/hooks/**/*.test.js', 'evals/cli/**/*.test.js'],
    testTimeout: 15000,
    hookTimeout: 10000,
  },
})
