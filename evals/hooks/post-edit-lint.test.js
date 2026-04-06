import { describe, it, expect } from 'vitest'
import { runHook } from '../utils/run-hook.js'

const hook = (file_path) => runHook('post-edit-lint.sh', { file_path })

describe('post-edit-lint: JS/TS files are linted', () => {
  const lintable = ['src/app.ts', 'src/index.tsx', 'lib/utils.js', 'components/Button.jsx']

  for (const file of lintable) {
    it(`processes ${file} (exit 0 — never blocks, just reports)`, () => {
      // Hook exits 0 even when lint errors found (it reports but doesn't block)
      const r = hook(file)
      expect(r.exitCode).toBe(0)
    })
  }
})

describe('post-edit-lint: config files are skipped', () => {
  const configFiles = [
    'vitest.config.ts',
    'jest.config.js',
    'eslint.config.js',
    'vite.config.ts',
    'src/component.config.ts',
  ]

  for (const file of configFiles) {
    it(`skips config file: ${file}`, () => {
      const r = hook(file)
      expect(r.exitCode).toBe(0)
      // Config files are skipped so no lint output
      expect(r.stdout).toBe('')
    })
  }
})

describe('post-edit-lint: non-JS/TS files are skipped', () => {
  const nonJsFiles = ['style.css', 'README.md', 'data.json', 'config.yaml', 'main.py', 'app.go']

  for (const file of nonJsFiles) {
    it(`skips ${file}`, () => {
      const r = hook(file)
      expect(r.exitCode).toBe(0)
      expect(r.stdout).toBe('')
    })
  }
})

describe('post-edit-lint: empty input', () => {
  it('exits 0 when file_path is empty', () => {
    const r = runHook('post-edit-lint.sh', { file_path: '' })
    expect(r.exitCode).toBe(0)
  })

  it('exits 0 when file_path is missing', () => {
    const r = runHook('post-edit-lint.sh', {})
    expect(r.exitCode).toBe(0)
  })
})
