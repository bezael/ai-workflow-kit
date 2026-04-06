import { describe, it, expect } from 'vitest'
import { runHook } from '../utils/run-hook.js'

const hook = (file_path) => runHook('post-write-format.sh', { file_path })

describe('post-write-format: formattable extensions', () => {
  const formattable = ['app.ts', 'Component.tsx', 'index.js', 'utils.jsx', 'styles.css', 'theme.scss', 'data.json', 'config.yaml', 'workflow.yml', 'README.md']

  for (const file of formattable) {
    it(`attempts to format ${file} (exit 0)`, () => {
      // The hook exits 0 whether or not prettier is available — it never blocks
      const r = hook(file)
      expect(r.exitCode).toBe(0)
    })
  }
})

describe('post-write-format: skipped extensions', () => {
  const skipped = ['photo.png', 'icon.jpg', 'font.woff2', 'script.py', 'main.go', 'App.swift', 'Makefile', 'binary.exe']

  for (const file of skipped) {
    it(`skips ${file} (exit 0, no formatter called)`, () => {
      const r = hook(file)
      expect(r.exitCode).toBe(0)
      // stdout is empty — no formatter output for skipped files
      expect(r.stdout).toBe('')
    })
  }
})

describe('post-write-format: empty input', () => {
  it('exits 0 when file_path is empty', () => {
    const r = runHook('post-write-format.sh', { file_path: '' })
    expect(r.exitCode).toBe(0)
  })

  it('exits 0 when file_path is missing from payload', () => {
    const r = runHook('post-write-format.sh', {})
    expect(r.exitCode).toBe(0)
  })
})
