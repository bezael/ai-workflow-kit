/**
 * run-hook.js
 * Helper to execute a hook shell script with a JSON payload via stdin.
 *
 * Usage:
 *   import { runHook } from './run-hook.js'
 *   const { exitCode, stdout, stderr } = await runHook('pre-bash-safety.sh', { command: 'rm -rf /' })
 */

import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const HOOKS_DIR = path.resolve(__dir, '../../hooks')

/**
 * @param {string} hookFile  - filename of the hook (e.g. 'pre-bash-safety.sh')
 * @param {object} payload   - JSON object passed to the hook via stdin
 * @param {object} [options]
 * @param {string} [options.cwd]  - working directory for the hook (default: project root)
 * @returns {{ exitCode: number, stdout: string, stderr: string }}
 */
export function runHook(hookFile, payload, options = {}) {
  const hookPath = path.join(HOOKS_DIR, hookFile)
  const input = JSON.stringify(payload)

  const result = spawnSync('bash', [hookPath], {
    input,
    encoding: 'utf8',
    cwd: options.cwd ?? path.resolve(__dir, '../..'),
    env: { ...process.env },
  })

  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}
