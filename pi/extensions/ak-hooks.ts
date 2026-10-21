/**
 * AI Workflow Kit — hooks for Pi
 *
 * Runs the kit's hook scripts (hooks/*.sh) on Pi's tool events, so Pi gets the
 * same guardrails as Claude Code from the same, already-tested scripts. The
 * extension only translates: it hands each script the JSON Claude Code would
 * send and maps the script's answer back onto Pi.
 *
 *   Claude Code              Pi
 *   PreToolUse   exit 2   →  tool_call blocked, stderr as the reason
 *   PreToolUse   "ask"    →  confirm dialog (blocked when there is no UI)
 *   PostToolUse  exit 2   →  stderr appended to the tool result for the model
 *   Stop                  →  agent_settled
 *
 * The scripts need bash and python3. When bash is missing the hooks are
 * skipped with one warning, as Claude Code skips a hook that fails to run.
 * Turn the extension off with `pi config`.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const HOOKS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "hooks");
const TIMEOUT_MS = 60_000;

type ClaudeTool = "Bash" | "Edit" | "Write";
type HookRun = { code: number | null; stdout: string; stderr: string; missing?: boolean };

const PRE_HOOKS: Record<ClaudeTool, string[]> = {
	Bash: ["pre-bash-safety.sh", "pre-commit-secrets.sh", "protect-tests.sh"],
	Edit: ["protect-tests.sh"],
	Write: ["protect-tests.sh"],
};
const POST_HOOKS: Record<ClaudeTool, string[]> = {
	Bash: [],
	Edit: ["post-write-format.sh", "post-edit-lint.sh"],
	Write: ["post-write-format.sh"],
};

/** Pi's tool call in the shape the scripts read: `tool_name` + `tool_input`. */
function toClaude(toolName: string, input: Record<string, unknown>, cwd: string) {
	const filePath = typeof input.path === "string" ? path.resolve(cwd, input.path) : undefined;
	switch (toolName) {
		case "bash":
			return { tool: "Bash" as const, payload: { tool_name: "Bash", tool_input: { command: input.command } } };
		case "edit":
			return { tool: "Edit" as const, payload: { tool_name: "Edit", tool_input: { file_path: filePath } } };
		case "write":
			return {
				tool: "Write" as const,
				payload: { tool_name: "Write", tool_input: { file_path: filePath, content: input.content } },
			};
		default:
			return undefined;
	}
}

function runHook(script: string, payload: unknown, cwd: string, signal?: AbortSignal): Promise<HookRun> {
	return new Promise((resolve) => {
		const child = spawn("bash", [path.join(HOOKS_DIR, script)], {
			cwd,
			env: { ...process.env, CLAUDE_PROJECT_DIR: cwd, AK_AGENT_NAME: "Pi" },
			signal,
			timeout: TIMEOUT_MS,
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d) => (stdout += d));
		child.stderr.on("data", (d) => (stderr += d));
		child.on("error", (err: NodeJS.ErrnoException) =>
			resolve({ code: null, stdout, stderr: err.message, missing: err.code === "ENOENT" }),
		);
		child.on("close", (code) => resolve({ code, stdout, stderr }));
		child.stdin.on("error", () => {}); // the script may exit before reading stdin
		child.stdin.end(JSON.stringify(payload));
	});
}

/** The reason of a `permissionDecision: "ask"` answer, if the script gave one. */
function askReason(stdout: string): string | undefined {
	try {
		const out = JSON.parse(stdout.trim())?.hookSpecificOutput;
		return out?.permissionDecision === "ask" ? String(out.permissionDecisionReason ?? "") : undefined;
	} catch {
		return undefined;
	}
}

export default function (pi: ExtensionAPI) {
	let warnedMissingBash = false;

	const run = async (script: string, payload: unknown, ctx: ExtensionContext) => {
		const result = await runHook(script, payload, ctx.cwd, ctx.signal);
		if (result.missing && !warnedMissingBash) {
			warnedMissingBash = true;
			if (ctx.hasUI) ctx.ui.notify("ai-workflow-kit: bash not found, hooks are off for this session", "warning");
		}
		return result;
	};

	pi.on("tool_call", async (event, ctx) => {
		const call = toClaude(event.toolName, event.input as Record<string, unknown>, ctx.cwd);
		if (!call) return undefined;

		for (const script of PRE_HOOKS[call.tool]) {
			const result = await run(script, call.payload, ctx);
			if (result.code === 2) {
				return { block: true, reason: result.stderr.trim() || `Blocked by ${script}` };
			}
			const reason = result.code === 0 ? askReason(result.stdout) : undefined;
			if (reason !== undefined) {
				if (!ctx.hasUI) return { block: true, reason: `${reason} (no UI to confirm)` };
				const ok = await ctx.ui.confirm("ai-workflow-kit", `${reason}\n\nRun it anyway?`);
				if (!ok) return { block: true, reason: `Declined by the user: ${reason}` };
			}
		}
		return undefined;
	});

	pi.on("tool_result", async (event, ctx) => {
		if (event.isError) return undefined;
		const call = toClaude(event.toolName, event.input, ctx.cwd);
		if (!call) return undefined;

		const notes: string[] = [];
		for (const script of POST_HOOKS[call.tool]) {
			const result = await run(script, call.payload, ctx);
			if (result.code === 2 && result.stderr.trim()) notes.push(result.stderr.trim());
		}
		if (!notes.length) return undefined;
		return {
			content: [...event.content, { type: "text" as const, text: notes.join("\n\n") }],
			structuredContent: event.structuredContent,
		};
	});

	// Pi may retry, compact or continue after agent_end; agent_settled means it is waiting for you.
	// Only in the terminal UI: print and JSON runs have nobody waiting to be notified.
	pi.on("agent_settled", async (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		await run("notify-done.sh", { stop_reason: "end_turn" }, ctx);
	});
}
